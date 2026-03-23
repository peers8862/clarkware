import type { EventEnvelope } from './base-event.js';
import type { NoteId, JobId, TaskId, IssueId, RevisionChainId } from '../common/branded.js';
import type { NoteType, ReviewState } from '../common/enums.js';

export type NoteCreatedEvent = EventEnvelope<
  'note.created',
  { readonly noteId: NoteId; readonly revisionChainId: RevisionChainId; readonly jobId: JobId | null; readonly taskId: TaskId | null; readonly issueId: IssueId | null; readonly noteType: NoteType; readonly body: string }
>;

export type NoteRevisedEvent = EventEnvelope<
  'note.revised',
  { readonly newNoteId: NoteId; readonly supersedesNoteId: NoteId; readonly revisionChainId: RevisionChainId; readonly previousBody: string; readonly newBody: string }
>;

export type NoteAIDraftAcceptedEvent = EventEnvelope<
  'note.ai_draft.accepted',
  { readonly noteId: NoteId; readonly revisionChainId: RevisionChainId; readonly acceptedByActorId: string; readonly previousReviewState: ReviewState }
>;
