import type { ConversationId, FacilityId, ZoneId, WorkstationId, JobId, IssueId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { ConversationType } from '../common/enums.js';

export type ConversationStatus = 'active' | 'archived' | 'closed';

export interface Conversation extends SoftDeletable {
  readonly id: ConversationId;
  readonly type: ConversationType;
  readonly facilityId: FacilityId | null;
  readonly zoneId: ZoneId | null;
  readonly workstationId: WorkstationId | null;
  readonly jobId: JobId | null;
  readonly issueId: IssueId | null;
  readonly title: string | null;
  readonly status: ConversationStatus;
  readonly xmppRoomJid: string;
  readonly metadata: Record<string, unknown>;
}

export type ConversationCreateInput = Omit<Conversation, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
