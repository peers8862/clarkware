import type { ShiftId, WorkstationId, ActorId, NoteId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';

export type ShiftStatus = 'active' | 'completed';

export interface Shift extends Timestamped {
  readonly id: ShiftId;
  readonly workstationId: WorkstationId;
  readonly operatorActorId: ActorId;
  readonly status: ShiftStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly handoffToActorId: ActorId | null;
  readonly handoffNoteId: NoteId | null;
  readonly metadata: Record<string, unknown>;
}

export type ShiftCreateInput = Omit<Shift, 'id' | 'status' | 'endedAt' | 'handoffToActorId' | 'handoffNoteId' | 'createdAt' | 'updatedAt'>;
