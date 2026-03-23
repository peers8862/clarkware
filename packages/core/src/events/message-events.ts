import type { EventEnvelope } from './base-event.js';
import type { MessageId, ConversationId } from '../common/branded.js';

export type MessageSentEvent = EventEnvelope<
  'message.sent',
  {
    readonly messageId: MessageId;
    readonly conversationId: ConversationId;
    readonly body: string;
    readonly xmppStanzaId: string;
  }
>;
