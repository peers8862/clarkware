import type { IssueId, JobId, TaskId, FacilityId, WorkstationId, ActorId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'investigating' | 'escalated' | 'resolved' | 'closed';
export type IssueType = 'quality' | 'safety' | 'equipment' | 'process' | 'data' | 'general';

export interface Issue extends SoftDeletable {
  readonly id: IssueId;
  readonly facilityId: FacilityId;
  readonly workstationId: WorkstationId | null;
  readonly jobId: JobId | null;
  readonly taskId: TaskId | null;
  readonly issueType: IssueType;
  readonly description: string;
  readonly severity: IssueSeverity;
  readonly status: IssueStatus;
  readonly resolution: string | null;
  readonly openedByActorId: ActorId;
  readonly escalatedToActorId: ActorId | null;
  readonly openedAt: Date;
  readonly resolvedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type IssueCreateInput = Omit<Issue, 'id' | 'status' | 'resolution' | 'escalatedToActorId' | 'resolvedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type IssueUpdateInput =
  Partial<Pick<Issue, 'description' | 'issueType' | 'severity' | 'status' | 'resolution' | 'escalatedToActorId' | 'metadata'>>
  & { readonly id: IssueId };
