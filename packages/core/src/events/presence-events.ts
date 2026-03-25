import type { EventEnvelope } from './base-event.js';
import type { ActorId, WorkstationId } from '../common/branded.js';
import type { PresenceStateValue } from '../common/enums.js';

export type PresenceChangedEvent = EventEnvelope<
  'presence.changed',
  { readonly actorId: ActorId; readonly workstationId: WorkstationId; readonly fromState: PresenceStateValue | null; readonly toState: PresenceStateValue }
>;
