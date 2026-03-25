import type { NoteId, JobId, TaskId, IssueId, FacilityId, WorkstationId, ArtifactId, RevisionChainId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';
import type { NoteType, ReviewState } from '../common/enums.js';
import type { ActorType } from '../identity/roles.js';

export type NoteVisibilityScope = 'all' | 'supervisors_up' | 'quality_only' | 'private';

export interface Note extends Timestamped {
  readonly id: NoteId;
  /** Groups all revisions of this logical note */
  readonly revisionChainId: RevisionChainId;
  /** Points to the note this one replaces — null for originals */
  readonly supersedesNoteId: NoteId | null;
  readonly authorActorId: string;
  readonly authorType: ActorType;
  readonly facilityId: FacilityId | null;
  readonly workstationId: WorkstationId | null;
  readonly jobId: JobId | null;
  readonly taskId: TaskId | null;
  readonly issueId: IssueId | null;
  readonly noteType: NoteType;
  readonly body: string;
  readonly visibilityScope: NoteVisibilityScope;
  readonly reviewState: ReviewState;
  readonly artifactRefs: ReadonlyArray<ArtifactId>;
  readonly revisedAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type NoteCreateInput = Omit<Note, 'id' | 'revisionChainId' | 'supersedesNoteId' | 'revisedAt' | 'createdAt' | 'updatedAt'>;
export type NoteReviseInput = {
  readonly supersedesNoteId: NoteId;
  readonly body: string;
  readonly noteType?: NoteType;
  readonly artifactRefs?: ReadonlyArray<ArtifactId>;
};
