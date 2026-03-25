import type { TaskId, JobId, ActorId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { TaskType } from '../common/enums.js';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Task extends SoftDeletable {
  readonly id: TaskId;
  readonly jobId: JobId;
  readonly title: string;
  readonly description: string | null;
  readonly taskType: TaskType;
  readonly status: TaskStatus;
  readonly ordinal: number;
  /** Any actor type can be assigned — person, AI agent, or automation */
  readonly assignedActorId: ActorId | null;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type TaskCreateInput = Omit<Task, 'id' | 'status' | 'completedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type TaskUpdateInput =
  Partial<Pick<Task, 'title' | 'description' | 'taskType' | 'status' | 'ordinal' | 'assignedActorId' | 'dueAt' | 'metadata'>>
  & { readonly id: TaskId };
