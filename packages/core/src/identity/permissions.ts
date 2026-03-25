import type { ActorType, Role } from './roles.js';
import type { AgentActionClass } from '../common/enums.js';

export enum PermissionCategory {
  View                      = 'view',
  Comment                   = 'comment',
  CreateNote                = 'create_note',
  AttachArtifact            = 'attach_artifact',
  InitiateConversation      = 'initiate_conversation',
  ParticipateRemotely       = 'participate_remotely',
  ReviewAIOutput            = 'review_ai_output',
  ApproveDisposition        = 'approve_disposition',
  AdministerIntegrations    = 'administer_integrations',
  ExportRecords             = 'export_records',
  ManageRetentionAndBackup  = 'manage_retention_and_backup',
}

/** All six scope levels — issue and conversation scopes added */
export type PermissionScope =
  | { readonly level: 'facility';     readonly facilityId: string }
  | { readonly level: 'zone';         readonly zoneId: string }
  | { readonly level: 'workstation';  readonly workstationId: string }
  | { readonly level: 'job';          readonly jobId: string }
  | { readonly level: 'issue';        readonly issueId: string }
  | { readonly level: 'conversation'; readonly conversationId: string };

export interface PermissionGrant {
  readonly id: string;
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly role: Role;
  readonly scope: PermissionScope;
  readonly permissions: ReadonlyArray<PermissionCategory>;
  /** For AI agents: which action classes are explicitly allowed */
  readonly allowedActionClasses: ReadonlyArray<AgentActionClass>;
  readonly grantedAt: Date;
  readonly grantedBy: string;
  readonly expiresAt: Date | null;
  /** Why this grant was issued — required for audit trail */
  readonly grantedForReason: string | null;
}
