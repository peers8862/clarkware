import { PermissionCategory, Role } from '@clark/core';
import type { Actor, PermissionScope } from '@clark/core';

/**
 * Default permissions granted to each role.
 * Fine-grained grants from PermissionGrant records supplement these.
 */
const ROLE_DEFAULT_PERMISSIONS: Record<Role, ReadonlySet<PermissionCategory>> = {
  [Role.Owner]: new Set(Object.values(PermissionCategory)),
  [Role.FacilityAdministrator]: new Set([
    PermissionCategory.View,
    PermissionCategory.Comment,
    PermissionCategory.CreateNote,
    PermissionCategory.AttachArtifact,
    PermissionCategory.InitiateConversation,
    PermissionCategory.ParticipateRemotely,
    PermissionCategory.ReviewAIOutput,
    PermissionCategory.ApproveDisposition,
    PermissionCategory.AdministerIntegrations,
    PermissionCategory.ExportRecords,
    PermissionCategory.ManageRetentionAndBackup,
  ]),
  [Role.Supervisor]: new Set([
    PermissionCategory.View,
    PermissionCategory.Comment,
    PermissionCategory.CreateNote,
    PermissionCategory.AttachArtifact,
    PermissionCategory.InitiateConversation,
    PermissionCategory.ReviewAIOutput,
    PermissionCategory.ApproveDisposition,
    PermissionCategory.ExportRecords,
  ]),
  [Role.Operator]: new Set([
    PermissionCategory.View,
    PermissionCategory.Comment,
    PermissionCategory.CreateNote,
    PermissionCategory.AttachArtifact,
    PermissionCategory.InitiateConversation,
  ]),
  [Role.QualityReviewer]: new Set([
    PermissionCategory.View,
    PermissionCategory.Comment,
    PermissionCategory.CreateNote,
    PermissionCategory.ReviewAIOutput,
    PermissionCategory.ApproveDisposition,
    PermissionCategory.ExportRecords,
  ]),
  [Role.RemoteExpert]: new Set([
    PermissionCategory.View,
    PermissionCategory.Comment,
    PermissionCategory.ParticipateRemotely,
  ]),
  [Role.ObserverAuditor]: new Set([
    PermissionCategory.View,
    PermissionCategory.ExportRecords,
  ]),
};

/**
 * Evaluate whether an actor has the given permission at the requested scope.
 * Facility-level permissions subsume zone, workstation, and job scopes.
 */
export function can(
  actor: Actor,
  action: PermissionCategory,
  _scope: PermissionScope,
): boolean {
  // Check role-based defaults first
  for (const role of actor.roles) {
    const perms = ROLE_DEFAULT_PERMISSIONS[role];
    if (perms?.has(action)) return true;
  }

  // Check effective permissions attached to actor (fine-grained grants)
  for (const permSet of actor.effectivePermissions.values()) {
    if (permSet.has(action)) return true;
  }

  return false;
}
