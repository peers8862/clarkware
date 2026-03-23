import type { TaskId, JobId, PersonId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Task extends SoftDeletable {
  readonly id: TaskId;
  readonly jobId: JobId;
  readonly name: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly ordinal: number;
  readonly assignedPersonId: PersonId | null;
  readonly completedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type TaskCreateInput = Omit<Task, 'id' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type TaskUpdateInput = Partial<Pick<Task, 'name' | 'description' | 'status' | 'ordinal' | 'assignedPersonId' | 'metadata'>> & { readonly id: TaskId };
