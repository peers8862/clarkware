import type { EventEnvelope } from './base-event.js';
import type { JobId, FacilityId, ZoneId, WorkstationId, ActorId } from '../common/branded.js';
import type { JobType, Priority } from '../common/enums.js';

export type JobCreatedEvent = EventEnvelope<
  'job.created',
  { readonly jobId: JobId; readonly facilityId: FacilityId; readonly zoneId: ZoneId; readonly workstationId: WorkstationId; readonly jobType: JobType; readonly title: string }
>;

export type JobStartedEvent = EventEnvelope<
  'job.started',
  { readonly jobId: JobId; readonly assignedActorId: ActorId | null }
>;

export type JobPausedEvent = EventEnvelope<
  'job.paused',
  { readonly jobId: JobId; readonly reason: string | null }
>;

export type JobCompletedEvent = EventEnvelope<
  'job.completed',
  { readonly jobId: JobId; readonly completedBy: ActorId }
>;

export type JobClosedEvent = EventEnvelope<
  'job.closed',
  { readonly jobId: JobId; readonly closedBy: ActorId; readonly reason: string | null }
>;

export type JobOwnershipTransferredEvent = EventEnvelope<
  'job.ownership.transferred',
  { readonly jobId: JobId; readonly fromActorId: ActorId; readonly toActorId: ActorId; readonly handoffNoteId: string | null }
>;
