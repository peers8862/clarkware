import type { JobId, FacilityId, ZoneId, WorkstationId, ActorId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { JobType, Priority } from '../common/enums.js';

export type JobStatus = 'draft' | 'active' | 'paused' | 'completed' | 'voided';

export interface Job extends SoftDeletable {
  readonly id: JobId;
  readonly facilityId: FacilityId;
  readonly zoneId: ZoneId;
  readonly workstationId: WorkstationId;
  /** Human-readable reference e.g. "NIAGARA-TB-A01-2026-0042" */
  readonly humanRef: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly jobType: JobType;
  readonly status: JobStatus;
  readonly priority: Priority;
  readonly customerRef: string | null;
  readonly productRef: string | null;
  /** Actor who currently owns this job — changes on handoff */
  readonly currentOwnerActorId: ActorId | null;
  readonly openedAt: Date | null;
  readonly closedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type JobCreateInput = Omit<Job,
  'id' | 'status' | 'openedAt' | 'closedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;
export type JobUpdateInput =
  Partial<Pick<Job, 'title' | 'description' | 'jobType' | 'status' | 'priority' | 'customerRef' | 'productRef' | 'currentOwnerActorId' | 'humanRef' | 'metadata'>>
  & { readonly id: JobId };
