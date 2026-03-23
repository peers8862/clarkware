import type { ActorType, Role } from './roles.js';

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

export type PermissionScope =
  | { readonly level: 'facility';    readonly facilityId: string }
  | { readonly level: 'zone';        readonly zoneId: string }
  | { readonly level: 'workstation'; readonly workstationId: string }
  | { readonly level: 'job';         readonly jobId: string };

export interface PermissionGrant {
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly role: Role;
  readonly scope: PermissionScope;
  readonly permissions: ReadonlyArray<PermissionCategory>;
  readonly grantedAt: Date;
  readonly grantedBy: string;
  readonly expiresAt: Date | null;
}
