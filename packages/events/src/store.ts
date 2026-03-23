import { withTransaction, query } from '@clark/db';
import type { DomainEvent } from '@clark/core';
import { ActorType, SourceType } from '@clark/core';
import type pg from 'pg';

export class ConcurrencyError extends Error {
  constructor(streamId: string, expected: number, actual: number) {
    super(
      `Concurrency conflict on stream "${streamId}": expected version ${expected}, got ${actual}`,
    );
    this.name = 'ConcurrencyError';
  }
}

interface RawEventRow {
  id: string;
  stream_id: string;
  sequence_number: string;
  global_seq: string;
  type: string;
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
  recorded_at: Date;
  payload: unknown;
  artifact_refs: string[];
  retention_class: string;
  metadata: unknown;
}

function rowToEvent(row: RawEventRow): DomainEvent {
  return {
    id: row.id,
    type: row.type,
    facilityId: row.facility_id ?? null,
    workstationId: row.workstation_id ?? null,
    jobId: row.job_id ?? null,
    issueId: row.issue_id ?? null,
    conversationId: row.conversation_id ?? null,
    streamId: row.stream_id,
    sequenceNumber: Number(row.sequence_number),
    actor: {
      actorId: row.actor_id,
      type: row.actor_type as ActorType,
    },
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    sourceType: row.source_type as SourceType,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    artifactRefs: row.artifact_refs ?? [],
    payload: row.payload,
    retentionClass: row.retention_class,
    metadata: row.metadata as Record<string, unknown>,
  } as unknown as DomainEvent;
}

export class EventStore {
  /**
   * Append events to a stream with optimistic concurrency.
   * @param streamId        Stream identifier, e.g. "job:job_01hx..."
   * @param expectedVersion The current max sequence_number (-1 if new stream)
   * @param events          Partially-constructed domain events (no streamId/sequenceNumber)
   */
  async append(
    streamId: string,
    expectedVersion: number,
    events: Omit<DomainEvent, 'streamId' | 'sequenceNumber'>[],
  ): Promise<void> {
    if (events.length === 0) return;

    await withTransaction(async (client: pg.PoolClient) => {
      // Optimistic concurrency check
      const versionResult = await client.query<{ max_seq: string | null }>(
        'SELECT MAX(sequence_number) as max_seq FROM events WHERE stream_id = $1',
        [streamId],
      );
      const currentVersion =
        versionResult.rows[0]?.max_seq != null
          ? Number(versionResult.rows[0].max_seq)
          : -1;

      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyError(streamId, expectedVersion, currentVersion);
      }

      let seq = expectedVersion + 1;
      for (const event of events) {
        await client.query(
          `INSERT INTO events (
             id, stream_id, sequence_number, type,
             facility_id, workstation_id, job_id, issue_id, conversation_id,
             actor_id, actor_type, source_type,
             correlation_id, causation_id,
             occurred_at, recorded_at,
             payload, artifact_refs, retention_class, metadata
           ) VALUES (
             $1, $2, $3, $4,
             $5, $6, $7, $8, $9,
             $10, $11, $12,
             $13, $14,
             $15, now(),
             $16, $17, $18, $19
           )`,
          [
            event.id,
            streamId,
            seq++,
            event.type,
            event.facilityId ?? null,
            event.workstationId ?? null,
            event.jobId ?? null,
            event.issueId ?? null,
            event.conversationId ?? null,
            event.actor.actorId,
            event.actor.type,
            event.sourceType ?? SourceType.System,
            event.correlationId ?? null,
            event.causationId ?? null,
            event.occurredAt,
            JSON.stringify(event.payload),
            event.artifactRefs ?? [],
            event.retentionClass ?? 'operational',
            JSON.stringify(event.metadata ?? {}),
          ],
        );
      }
    });
  }

  async readStream(streamId: string, fromSequence = 0): Promise<DomainEvent[]> {
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE stream_id = $1 AND sequence_number >= $2
       ORDER BY sequence_number ASC`,
      [streamId, fromSequence],
    );
    return rows.map(rowToEvent);
  }

  /** Read events by type, ordered by global_seq for correct cross-stream ordering */
  async readByType(types: string[], since?: Date, limit = 1000): Promise<DomainEvent[]> {
    const placeholders = types.map((_, i) => `$${i + 1}`).join(', ');
    const sinceParam = since ?? new Date(0);
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE type IN (${placeholders})
         AND occurred_at >= $${types.length + 1}
       ORDER BY global_seq ASC
       LIMIT $${types.length + 2}`,
      [...types, sinceParam, limit],
    );
    return rows.map(rowToEvent);
  }

  /** Read all events for a facility, ordered by global_seq */
  async readByFacility(facilityId: string, since?: Date, limit = 1000): Promise<DomainEvent[]> {
    const sinceParam = since ?? new Date(0);
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE facility_id = $1 AND occurred_at >= $2
       ORDER BY global_seq ASC
       LIMIT $3`,
      [facilityId, sinceParam, limit],
    );
    return rows.map(rowToEvent);
  }

  /** Read all events for a job — used for aggregate rebuilding */
  async readByJob(jobId: string, fromGlobalSeq = 0): Promise<DomainEvent[]> {
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE job_id = $1 AND global_seq >= $2
       ORDER BY global_seq ASC`,
      [jobId, fromGlobalSeq],
    );
    return rows.map(rowToEvent);
  }

  /** Read all events from a global sequence position (catch-up projectors) */
  async readAll(fromGlobalSeq = 0, limit = 1000): Promise<DomainEvent[]> {
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE global_seq >= $1
       ORDER BY global_seq ASC
       LIMIT $2`,
      [fromGlobalSeq, limit],
    );
    return rows.map(rowToEvent);
  }

  /** Current global_seq watermark — used by catch-up projectors to track position */
  async getGlobalSeq(): Promise<number> {
    const rows = await query<{ max_global: string | null }>(
      'SELECT MAX(global_seq) as max_global FROM events',
      [],
    );
    return rows[0]?.max_global != null ? Number(rows[0].max_global) : 0;
  }
}
