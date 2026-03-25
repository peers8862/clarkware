import { ConcurrencyError, EventStore } from '@clark/events';
import type { DomainEvent } from '@clark/core';
import { ActorType, SourceType } from '@clark/core';
import type { EventQueue, QueuedEvent } from './queue.js';
import type { ConflictHandler } from './conflict-handler.js';

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
}

function queuedEventToDomainEvent(qe: QueuedEvent): Omit<DomainEvent, 'streamId' | 'sequenceNumber'> {
  return {
    id: qe.event_id,
    type: qe.event_type as DomainEvent['type'],
    facilityId: qe.facility_id,
    workstationId: qe.workstation_id,
    jobId: qe.job_id,
    issueId: qe.issue_id,
    conversationId: qe.conversation_id,
    actor: {
      actorId: qe.actor_id,
      type: qe.actor_type as ActorType,
    },
    occurredAt: qe.occurred_at,
    recordedAt: new Date(),
    sourceType: qe.source_type as SourceType,
    correlationId: qe.correlation_id,
    causationId: qe.causation_id,
    artifactRefs: qe.artifact_refs ?? [],
    payload: qe.payload,
    retentionClass: qe.retention_class,
    metadata: qe.metadata as Record<string, unknown>,
  } as unknown as Omit<DomainEvent, 'streamId' | 'sequenceNumber'>;
}

export class SyncEngine {
  private readonly eventStore: EventStore;
  private readonly queue: EventQueue;
  private readonly conflictHandler: ConflictHandler;
  private flushing = false;

  constructor(
    eventStore: EventStore,
    queue: EventQueue,
    conflictHandler: ConflictHandler,
  ) {
    this.eventStore = eventStore;
    this.queue = queue;
    this.conflictHandler = conflictHandler;
  }

  /**
   * Process a batch of pending events from the queue.
   * Returns a SyncResult summarising what happened.
   */
  async flush(batchSize = 50): Promise<SyncResult> {
    if (this.flushing) {
      // Already running — skip this call
      return { synced: 0, conflicts: 0, failed: 0 };
    }

    this.flushing = true;
    const result: SyncResult = { synced: 0, conflicts: 0, failed: 0 };

    try {
      const pending = await this.queue.getPending(batchSize);
      if (pending.length === 0) return result;

      await this.queue.markSyncing(pending.map((e) => e.id));

      for (const queuedEvent of pending) {
        await this.processOne(queuedEvent, result);
      }
    } finally {
      this.flushing = false;
    }

    return result;
  }

  private async processOne(queuedEvent: QueuedEvent, result: SyncResult): Promise<void> {
    try {
      const domainEvent = queuedEventToDomainEvent(queuedEvent);

      // Determine the current version of the stream by reading what's there
      // We use expectedVersion = -1 (new stream) or the actual max seq.
      // For simplicity we let the EventStore's optimistic concurrency check
      // detect conflicts; we try appending with the version that would be
      // correct if no one else has written since enqueue.
      // The caller is responsible for setting expectedVersion correctly;
      // here we always attempt with the current max seq from the store.
      const currentVersion = await this.getCurrentStreamVersion(queuedEvent.stream_id);

      await this.eventStore.append(queuedEvent.stream_id, currentVersion, [domainEvent]);

      await this.queue.markSynced(queuedEvent.id, queuedEvent.event_id);
      result.synced++;
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        result.conflicts++;
        try {
          const conflictType = await this.conflictHandler.classifyConflict(
            queuedEvent,
            // The conflicting event is the one at the head of the stream
            queuedEvent.stream_id,
          );
          await this.conflictHandler.recordConflict(
            queuedEvent.id,
            queuedEvent.stream_id,
            conflictType,
          );
        } catch {
          // Best-effort conflict recording; don't let it mask the original error
        }
        await this.queue.markFailed(queuedEvent.id, true);
      } else {
        result.failed++;
        await this.queue.markFailed(queuedEvent.id, true);
      }
    }
  }

  private async getCurrentStreamVersion(streamId: string): Promise<number> {
    // Read the stream from the EventStore to find the current max sequence number.
    // We only need the last event, but EventStore exposes readStream which reads all.
    // For efficiency we could use a raw query, but we stay within the abstraction.
    const events = await this.eventStore.readStream(streamId);
    if (events.length === 0) return -1;
    const last = events[events.length - 1];
    return last !== undefined ? last.sequenceNumber : -1;
  }

  /**
   * Start a continuous sync loop that calls flush() every intervalMs.
   * Returns a stop function that halts the loop.
   */
  async startContinuous(intervalMs = 5000): Promise<() => void> {
    let stopped = false;

    const loop = (): void => {
      if (stopped) return;
      this.flush().catch(() => {
        // Errors are intentionally swallowed in the continuous loop;
        // individual event failures are handled inside flush().
      }).finally(() => {
        if (!stopped) {
          setTimeout(loop, intervalMs);
        }
      });
    };

    // Kick off the first iteration
    setTimeout(loop, intervalMs);

    return () => {
      stopped = true;
    };
  }
}
