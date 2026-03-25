import type { WorkstationId, ActorId, AutomationServiceId } from '../common/branded.js';
import type { PresenceStateValue } from '../common/enums.js';

/** Scoped per (actorId, workstationId) pair — an actor can have different states at different stations */
export interface PresenceState {
  readonly actorId: ActorId;
  readonly workstationId: WorkstationId;
  readonly state: PresenceStateValue;
  /** When automation_active: which service triggered the state */
  readonly automationServiceId: AutomationServiceId | null;
  readonly updatedAt: Date;
}

export type PresenceStateUpsertInput = Omit<PresenceState, 'updatedAt'>;
