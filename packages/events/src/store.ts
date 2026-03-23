import { withTransaction, query } from '@clark/db';
import type { DomainEvent } from '@clark/core';
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
  type: string;
  occurred_at: Date;
  actor_id: string;
  actor_type: string;
  correlation_id: string | null;
  causation_id: string | null;
  payload: unknown;
  metadata: unknown;
}

function rowToEvent(row: RawEventRow): DomainEvent {
  return {
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    streamId: row.stream_id,
    sequenceNumber: Number(row.sequence_number),
    actor: { type: row.actor_type, id: row.actor_id } as DomainEvent['actor'],
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    payload: row.payload,
    metadata: row.metadata as Record<string, unknown>,
  } as unknown as DomainEvent;
}

export class EventStore {
  /**
   * Append events to a stream with optimistic concurrency.
   * @param streamId   Stream identifier, e.g. "job:job_01hx..."
   * @param expectedVersion  The current max sequence_number (-1 if stream is empty/new)
   * @param events     Array of partially-constructed domain events (id, type, payload, etc.)
   */
  async append(
    streamId: string,
    expectedVersion: number,
    events: Omit<DomainEvent, 'streamId' | 'sequenceNumber'>[],
  ): Promise<void> {
    if (events.length === 0) return;

    await withTransaction(async (client: pg.PoolClient) => {
      // Check current max sequence_number
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
          `INSERT INTO events
             (id, stream_id, sequence_number, type, occurred_at,
              actor_id, actor_type, correlation_id, causation_id, payload, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            event.id,
            streamId,
            seq++,
            event.type,
            event.occurredAt,
            event.actor.id,
            event.actor.type,
            event.correlationId,
            event.causationId,
            JSON.stringify(event.payload),
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

  async readByType(types: string[], since?: Date, limit = 1000): Promise<DomainEvent[]> {
    const placeholders = types.map((_, i) => `$${i + 1}`).join(', ');
    const sinceParam = since ?? new Date(0);
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE type IN (${placeholders})
         AND occurred_at >= $${types.length + 1}
       ORDER BY occurred_at ASC
       LIMIT $${types.length + 2}`,
      [...types, sinceParam, limit],
    );
    return rows.map(rowToEvent);
  }

  async readAll(since?: Date, limit = 1000): Promise<DomainEvent[]> {
    const sinceParam = since ?? new Date(0);
    const rows = await query<RawEventRow>(
      `SELECT * FROM events
       WHERE occurred_at >= $1
       ORDER BY occurred_at ASC
       LIMIT $2`,
      [sinceParam, limit],
    );
    return rows.map(rowToEvent);
  }
}
