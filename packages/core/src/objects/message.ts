import type { MessageId, ConversationId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';

export interface Message extends Timestamped {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly senderJid: string;
  readonly body: string;
  readonly xmppStanzaId: string;
  readonly sentAt: Date;
  readonly metadata: Record<string, unknown>;
}

export type MessageCreateInput = Omit<Message, 'id' | 'createdAt' | 'updatedAt'>;
