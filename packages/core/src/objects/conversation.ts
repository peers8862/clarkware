import type { ConversationId, JobId, PersonId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type ConversationType = 'job_thread' | 'direct';

export interface Conversation extends SoftDeletable {
  readonly id: ConversationId;
  readonly type: ConversationType;
  readonly jobId: JobId | null;
  readonly xmppRoomJid: string;
  readonly subject: string | null;
  readonly participantIds: ReadonlyArray<PersonId>;
  readonly metadata: Record<string, unknown>;
}

export type ConversationCreateInput = Omit<Conversation, 'id' | 'participantIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
