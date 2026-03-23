import type { EventEnvelope } from './base-event.js';
import type { NoteId, JobId, TaskId } from '../common/branded.js';

export type NoteCreatedEvent = EventEnvelope<
  'note.created',
  {
    readonly noteId: NoteId;
    readonly jobId: JobId;
    readonly taskId: TaskId | null;
    readonly body: string;
  }
>;

export type NoteRevisedEvent = EventEnvelope<
  'note.revised',
  {
    readonly noteId: NoteId;
    readonly previousBody: string;
    readonly newBody: string;
  }
>;
