import type { NoteId, JobId, TaskId, PersonId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';

export interface Note extends Timestamped {
  readonly id: NoteId;
  readonly jobId: JobId;
  readonly taskId: TaskId | null;
  readonly body: string;
  readonly authorId: PersonId;
  readonly revisionNumber: number;
  readonly metadata: Record<string, unknown>;
}

export type NoteCreateInput = Omit<Note, 'id' | 'revisionNumber' | 'createdAt' | 'updatedAt'>;
export type NoteReviseInput = { readonly id: NoteId; readonly body: string };
