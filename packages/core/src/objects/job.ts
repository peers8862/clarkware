import type { JobId, FacilityId, ZoneId, WorkstationId, PersonId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type JobStatus = 'draft' | 'active' | 'paused' | 'completed' | 'voided';

export interface Job extends SoftDeletable {
  readonly id: JobId;
  readonly facilityId: FacilityId;
  readonly zoneId: ZoneId;
  readonly workstationId: WorkstationId;
  readonly name: string;
  readonly description: string | null;
  readonly status: JobStatus;
  readonly assignedPersonId: PersonId | null;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type JobCreateInput = Omit<Job, 'id' | 'status' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type JobUpdateInput = Partial<Pick<Job, 'name' | 'description' | 'status' | 'assignedPersonId' | 'metadata'>> & { readonly id: JobId };
