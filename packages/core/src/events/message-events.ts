import type { EventEnvelope } from './base-event.js';
import type { MessageId, ConversationId } from '../common/branded.js';
import type { MessageClass, ReviewState } from '../common/enums.js';

export type ConversationCreatedEvent = EventEnvelope<
  'conversation.created',
  { readonly conversationId: ConversationId; readonly xmppRoomJid: string; readonly linkedJobId: string | null; readonly linkedIssueId: string | null }
>;

export type MessageSentEvent = EventEnvelope<
  'message.sent',
  { readonly messageId: MessageId; readonly conversationId: ConversationId; readonly messageClass: MessageClass; readonly body: string; readonly xmppStanzaId: string }
>;

export type MessageReviewedEvent = EventEnvelope<
  'message.reviewed',
  { readonly messageId: MessageId; readonly reviewState: ReviewState; readonly reviewedByActorId: string }
>;
