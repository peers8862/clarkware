import type { EventEnvelope } from './base-event.js';
import type { WorkstationId, PersonId } from '../common/branded.js';

export type WorkstationSessionStartedEvent = EventEnvelope<
  'workstation.session.started',
  {
    readonly workstationId: WorkstationId;
    readonly personId: PersonId;
    readonly sessionToken: string;
  }
>;

export type WorkstationSessionEndedEvent = EventEnvelope<
  'workstation.session.ended',
  {
    readonly workstationId: WorkstationId;
    readonly personId: PersonId;
    readonly durationSeconds: number;
  }
>;
