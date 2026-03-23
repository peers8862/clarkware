import type { EventEnvelope } from './base-event.js';
import type { ShiftId, WorkstationId, ActorId, NoteId } from '../common/branded.js';

export type ShiftStartedEvent = EventEnvelope<
  'shift.started',
  { readonly shiftId: ShiftId; readonly workstationId: WorkstationId; readonly operatorActorId: ActorId }
>;

export type ShiftHandedOffEvent = EventEnvelope<
  'shift.handed_off',
  { readonly shiftId: ShiftId; readonly workstationId: WorkstationId; readonly fromActorId: ActorId; readonly toActorId: ActorId; readonly handoffNoteId: NoteId | null }
>;
