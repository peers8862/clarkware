import type { MessageId, ConversationId, JobId, IssueId, WorkstationId, ArtifactId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';
import type { MessageClass, ReviewState } from '../common/enums.js';
import type { ActorType } from '../identity/roles.js';

export interface Message extends Timestamped {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly senderActorId: string;
  readonly senderType: ActorType;
  readonly senderJid: string;
  readonly messageClass: MessageClass;
  readonly body: string;
  readonly reviewState: ReviewState;
  readonly xmppStanzaId: string;
  readonly sentAt: Date;
  readonly jobId: JobId | null;
  readonly issueId: IssueId | null;
  readonly workstationId: WorkstationId | null;
  readonly artifactRefs: ReadonlyArray<ArtifactId>;
  readonly replyToMessageId: MessageId | null;
  /** Set when this message is superseded by an edit */
  readonly supersededByMessageId: MessageId | null;
  readonly metadata: Record<string, unknown>;
}

export type MessageCreateInput = Omit<Message, 'id' | 'supersededByMessageId' | 'createdAt' | 'updatedAt'>;
