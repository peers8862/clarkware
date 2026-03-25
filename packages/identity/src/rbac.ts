import { PermissionCategory, Role, ActorType } from '@clark/core';
import type { Actor, PermissionScope, PermissionGrant } from '@clark/core';

/**
 * Default permissions granted to each role.
 * Fine-grained PermissionGrant records supplement or restrict these defaults.
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
  // AI agents and automation services have no default permissions —
  // all access is granted explicitly via PermissionGrant records.
  [Role.AgentBounded]: new Set(),
  [Role.ServiceAdapter]: new Set(),
};

/**
 * Scope hierarchy: a grant at a broader scope covers all narrower scopes.
 * facility > zone > workstation > job > issue > conversation
 */
const SCOPE_HIERARCHY: ReadonlyArray<PermissionScope['level']> = [
  'facility',
  'zone',
  'workstation',
  'job',
  'issue',
  'conversation',
];

function scopeCoversRequest(
  grantScope: PermissionScope,
  requestedScope: PermissionScope,
): boolean {
  const grantLevel = SCOPE_HIERARCHY.indexOf(grantScope.level);
  const requestedLevel = SCOPE_HIERARCHY.indexOf(requestedScope.level);

  // Broader scopes subsume narrower ones
  if (grantLevel < requestedLevel) return true;

  // Same level — check the specific ID matches
  if (grantLevel === requestedLevel) {
    switch (grantScope.level) {
      case 'facility':     return grantScope.facilityId === (requestedScope as typeof grantScope).facilityId;
      case 'zone':         return grantScope.zoneId === (requestedScope as typeof grantScope).zoneId;
      case 'workstation':  return grantScope.workstationId === (requestedScope as typeof grantScope).workstationId;
      case 'job':          return grantScope.jobId === (requestedScope as typeof grantScope).jobId;
      case 'issue':        return grantScope.issueId === (requestedScope as typeof grantScope).issueId;
      case 'conversation': return grantScope.conversationId === (requestedScope as typeof grantScope).conversationId;
    }
  }

  return false;
}

function isGrantActive(grant: PermissionGrant, now = new Date()): boolean {
  return grant.expiresAt === null || grant.expiresAt > now;
}

/**
 * Evaluate whether an actor has `action` at `requestedScope`.
 *
 * Evaluation order:
 * 1. Role-based defaults (human actors only) — apply at any scope
 * 2. Explicit PermissionGrant records — scope-aware with expiry enforcement
 *
 * @param actor          The resolved actor (from auth middleware)
 * @param action         The PermissionCategory being requested
 * @param requestedScope The scope at which the action is being attempted
 * @param grants         Optional: explicit grants loaded from DB for fine-grained checks
 */
export function can(
  actor: Actor,
  action: PermissionCategory,
  requestedScope: PermissionScope,
  grants?: ReadonlyArray<PermissionGrant>,
): boolean {
  const now = new Date();

  // AI agents and automation services never get role-based defaults
  const isNonHuman =
    actor.type === ActorType.AIAgent || actor.type === ActorType.AutomationService;

  if (!isNonHuman) {
    for (const role of actor.roles) {
      const perms = ROLE_DEFAULT_PERMISSIONS[role];
      if (perms?.has(action)) return true;
    }
  }

  // Check effective permissions map (populated from grants at token issue)
  for (const [_scopeLevel, permSet] of actor.effectivePermissions) {
    if (permSet.has(action)) return true;
  }

  // Check explicit grants (fine-grained, scope-aware, with expiry)
  if (grants) {
    for (const grant of grants) {
      if (!isGrantActive(grant, now)) continue;
      if (!grant.permissions.includes(action)) continue;
      if (scopeCoversRequest(grant.scope, requestedScope)) return true;
    }
  }

  return false;
}

// ============================================================
// JID construction helpers (per-facility XMPP domains)
// ============================================================

/** Build a JID for a human person: person.{username}@{facilityXmppDomain} */
export function personJid(username: string, facilityXmppDomain: string): string {
  return `person.${username}@${facilityXmppDomain}`;
}

/** Build a JID for an AI agent: agent.{agentName}@{facilityXmppDomain} */
export function agentJid(agentName: string, facilityXmppDomain: string): string {
  return `agent.${agentName}@${facilityXmppDomain}`;
}

/** Build a JID for an automation service: svc.{serviceName}@{facilityXmppDomain} */
export function serviceJid(serviceName: string, facilityXmppDomain: string): string {
  return `svc.${serviceName}@${facilityXmppDomain}`;
}

/**
 * Parse actor type from a JID local-part prefix.
 * Returns null if the prefix is unrecognised.
 */
export function actorTypeFromJid(jid: string): ActorType | null {
  const localPart = jid.split('@')[0] ?? '';
  if (localPart.startsWith('person.')) return ActorType.HumanUser;
  if (localPart.startsWith('agent.')) return ActorType.AIAgent;
  if (localPart.startsWith('svc.')) return ActorType.AutomationService;
  return null;
}
