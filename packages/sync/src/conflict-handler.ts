import { query } from '@clark/db';
import type { QueuedEvent } from './queue.js';

export type ConflictType =
  | 'sequence_gap'
  | 'concurrent_write'
  | 'version_mismatch'
  | 'schema_mismatch';

interface EventRow {
  id: string;
  stream_id: string;
  sequence_number: string;
  type: string;
}

export class ConflictHandler {
  /**
   * Classify the conflict type by comparing the queued event against the
   * conflicting event already in the events table.
   */
  async classifyConflict(
    queuedEvent: QueuedEvent,
    conflictingEventId: string,
  ): Promise<ConflictType> {
    const conflictingRows = await query<EventRow>(
      `SELECT id, stream_id, sequence_number, type FROM events WHERE id = $1`,
      [conflictingEventId],
    );

    const conflicting = conflictingRows[0];
    if (!conflicting) {
      // No matching event found — treat as version mismatch
      return 'version_mismatch';
    }

    // Schema mismatch: same event type but on different streams
    if (
      conflicting.type !== queuedEvent.event_type &&
      conflicting.stream_id === queuedEvent.stream_id
    ) {
      return 'schema_mismatch';
    }

    // Sequence gap: the conflicting event is on the same stream but there's
    // a gap between the last known sequence and what the queue expected
    if (conflicting.stream_id === queuedEvent.stream_id) {
      const maxSeqRows = await query<{ max_seq: string | null }>(
        `SELECT MAX(sequence_number) as max_seq FROM events WHERE stream_id = $1`,
        [queuedEvent.stream_id],
      );
      const maxSeq =
        maxSeqRows[0]?.max_seq != null ? Number(maxSeqRows[0].max_seq) : -1;

      // If there are events beyond what was in the queue at enqueue time,
      // this is a concurrent write
      if (maxSeq > Number(conflicting.sequence_number)) {
        return 'concurrent_write';
      }

      return 'sequence_gap';
    }

    return 'version_mismatch';
  }

  /**
   * Record a conflict in the sync_conflicts table.
   * Returns the conflict's generated ID.
   */
  async recordConflict(
    queuedEventId: string,
    conflictingEventId: string,
    conflictType: ConflictType,
    resolution?: string,
  ): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO sync_conflicts (
         queued_event_id, conflicting_event_id, conflict_type, resolution
       ) VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [queuedEventId, conflictingEventId, conflictType, resolution ?? null],
    );

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to record conflict: no ID returned');
    }
    return row.id;
  }

  /** Update an existing conflict record with a resolution. */
  async resolveConflict(
    conflictId: string,
    resolution: string,
    resolvedBy: string,
  ): Promise<void> {
    await query(
      `UPDATE sync_conflicts
       SET resolution  = $1,
           resolved_by = $2,
           resolved_at = now()
       WHERE id = $3`,
      [resolution, resolvedBy, conflictId],
    );
  }
}
