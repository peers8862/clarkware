import type { EventId } from '../common/branded.js';
import type { ActorType } from '../identity/roles.js';

export interface EventEnvelope<TType extends string, TPayload> {
  readonly id: EventId;
  readonly type: TType;
  readonly occurredAt: Date;
  readonly streamId: string;
  readonly sequenceNumber: number;
  readonly actor: { readonly type: ActorType; readonly id: string };
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly payload: TPayload;
  readonly metadata: Record<string, unknown>;
}
