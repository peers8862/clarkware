import type { IssueId, JobId, TaskId, PersonId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Issue extends SoftDeletable {
  readonly id: IssueId;
  readonly jobId: JobId;
  readonly taskId: TaskId | null;
  readonly description: string;
  readonly severity: IssueSeverity;
  readonly status: IssueStatus;
  readonly resolution: string | null;
  readonly reportedBy: PersonId;
  readonly resolvedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type IssueCreateInput = Omit<Issue, 'id' | 'status' | 'resolution' | 'resolvedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type IssueUpdateInput = Partial<Pick<Issue, 'description' | 'severity' | 'status' | 'resolution' | 'metadata'>> & { readonly id: IssueId };
