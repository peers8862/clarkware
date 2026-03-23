import type { EventEnvelope } from './base-event.js';
import type { JobId, FacilityId, ZoneId, WorkstationId, PersonId } from '../common/branded.js';

export type JobStartedEvent = EventEnvelope<
  'job.started',
  {
    readonly jobId: JobId;
    readonly facilityId: FacilityId;
    readonly zoneId: ZoneId;
    readonly workstationId: WorkstationId;
    readonly assignedPersonId: PersonId | null;
  }
>;

export type JobPausedEvent = EventEnvelope<
  'job.paused',
  {
    readonly jobId: JobId;
    readonly reason: string | null;
  }
>;

export type JobCompletedEvent = EventEnvelope<
  'job.completed',
  {
    readonly jobId: JobId;
    readonly completedBy: string;
  }
>;
