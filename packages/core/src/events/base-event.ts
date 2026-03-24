import type { EventId, FacilityId, WorkstationId, JobId, IssueId, ConversationId, ArtifactId } from '../common/branded.js';
import type { SourceType } from '../common/enums.js';
import type { ActorType } from '../identity/roles.js';

export interface EventEnvelope<TType extends string, TPayload> {
  readonly id: EventId;
  readonly type: TType;

  // Context denormalization for fast facility/workstation queries without joins
  readonly facilityId: FacilityId | null;
  readonly workstationId: WorkstationId | null;
  readonly jobId: JobId | null;
  readonly issueId: IssueId | null;
  readonly conversationId: ConversationId | null;

  readonly streamId: string;
  readonly sequenceNumber: number;

  readonly actor: {
    readonly actorId: string;
    readonly type: ActorType;
  };

  /** When the action actually occurred (e.g. instrument timestamp) */
  readonly occurredAt: Date;
  /** When this event was recorded in the system — may differ from occurredAt for imports */
  readonly recordedAt: Date;

  /** How this event was generated */
  readonly sourceType: SourceType;

  readonly correlationId: string | null;
  readonly causationId: string | null;

  /** Artifacts produced or consumed by this event */
  readonly artifactRefs: ReadonlyArray<ArtifactId>;

  readonly payload: TPayload;
  readonly retentionClass: string;
  readonly metadata: Record<string, unknown>;
}
