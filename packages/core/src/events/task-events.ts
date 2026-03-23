import type { EventEnvelope } from './base-event.js';
import type { TaskId, JobId } from '../common/branded.js';

export type TaskCompletedEvent = EventEnvelope<
  'task.completed',
  {
    readonly taskId: TaskId;
    readonly jobId: JobId;
    readonly completedBy: string;
  }
>;

export type TaskSkippedEvent = EventEnvelope<
  'task.skipped',
  {
    readonly taskId: TaskId;
    readonly jobId: JobId;
    readonly reason: string | null;
  }
>;
