import type { DomainEvent } from '@clark/core';
import { query } from '@clark/db';

export interface QueuedEvent {
  id: string;
  stream_id: string;
  event_id: string;
  event_type: string;
  facility_id: string | null;
  workstation_id: string | null;
  job_id: string | null;
  issue_id: string | null;
  conversation_id: string | null;
  actor_id: string;
  actor_type: string;
  source_type: string;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: Date;
  payload: unknown;
  artifact_refs: string[];
  retention_class: string;
  metadata: unknown;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  attempts: number;
  synced_event_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class EventQueue {
  /**
   * Enqueue an event to the event_queue table.
   * Returns the queued event's generated ID.
   */
  async enqueue(
    event: Omit<DomainEvent, 'streamId' | 'sequenceNumber'>,
    streamId: string,
  ): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO event_queue (
         stream_id, event_id, event_type,
         facility_id, workstation_id, job_id, issue_id, conversation_id,
         actor_id, actor_type, source_type,
         correlation_id, causation_id,
         occurred_at, payload, artifact_refs, retention_class, metadata,
         status, attempts
       ) VALUES (
         $1, $2, $3,
         $4, $5, $6, $7, $8,
         $9, $10, $11,
         $12, $13,
         $14, $15, $16, $17, $18,
         'pending', 0
       ) RETURNING id`,
      [
        streamId,
        event.id,
        event.type,
        event.facilityId ?? null,
        event.workstationId ?? null,
        event.jobId ?? null,
        event.issueId ?? null,
        event.conversationId ?? null,
        event.actor.actorId,
        event.actor.type,
        event.sourceType,
        event.correlationId ?? null,
        event.causationId ?? null,
        event.occurredAt,
        JSON.stringify(event.payload),
        event.artifactRefs ?? [],
        event.retentionClass ?? 'operational',
        JSON.stringify(event.metadata ?? {}),
      ],
    );

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to enqueue event: no ID returned');
    }
    return row.id;
  }

  /** Fetch pending events ordered by created_at ASC. */
  async getPending(limit = 50): Promise<QueuedEvent[]> {
    return query<QueuedEvent>(
      `SELECT * FROM event_queue
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
  }

  /** Set status='syncing' for the given IDs. */
  async markSyncing(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await query(
      `UPDATE event_queue
       SET status = 'syncing', updated_at = now()
       WHERE id IN (${placeholders})`,
      ids,
    );
  }

  /** Set status='synced' and record the synced event ID. */
  async markSynced(id: string, syncedEventId: string): Promise<void> {
    await query(
      `UPDATE event_queue
       SET status = 'synced', synced_event_id = $1, updated_at = now()
       WHERE id = $2`,
      [syncedEventId, id],
    );
  }

  /**
   * Set status='failed'. If incrementAttempts is true and the attempt count
   * reaches 5, set status='conflict' instead to flag it for manual review.
   */
  async markFailed(id: string, incrementAttempts = true): Promise<void> {
    if (incrementAttempts) {
      await query(
        `UPDATE event_queue
         SET attempts    = attempts + 1,
             status      = CASE WHEN attempts + 1 >= 5 THEN 'conflict' ELSE 'failed' END,
             updated_at  = now()
         WHERE id = $1`,
        [id],
      );
    } else {
      await query(
        `UPDATE event_queue
         SET status = 'failed', updated_at = now()
         WHERE id = $1`,
        [id],
      );
    }
  }
}
