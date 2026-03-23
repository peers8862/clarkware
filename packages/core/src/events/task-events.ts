import type { EventEnvelope } from './base-event.js';
import type { TaskId, JobId, ActorId } from '../common/branded.js';

export type TaskAssignedEvent = EventEnvelope<
  'task.assigned',
  { readonly taskId: TaskId; readonly jobId: JobId; readonly assignedToActorId: ActorId }
>;

export type TaskCompletedEvent = EventEnvelope<
  'task.completed',
  { readonly taskId: TaskId; readonly jobId: JobId; readonly completedBy: ActorId }
>;

export type TaskSkippedEvent = EventEnvelope<
  'task.skipped',
  { readonly taskId: TaskId; readonly jobId: JobId; readonly reason: string | null }
>;
