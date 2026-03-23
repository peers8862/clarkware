import type { ActorId, PersonId, AgentId, AutomationServiceId } from '../common/branded.js';
import type { Role, ActorType } from './roles.js';
import type { PermissionCategory, PermissionScope } from './permissions.js';
import type { AgentActionClass } from '../common/enums.js';

/**
 * Unified actor identity.
 * All actor types share a single actorId that resolves to the `actors` table.
 * The typed ref (personId / agentId / serviceId) points to the specialisation table.
 */
export interface HumanActor {
  readonly actorId: ActorId;
  readonly type: ActorType.HumanUser;
  readonly personId: PersonId;
  readonly roles: ReadonlyArray<Role>;
  readonly effectivePermissions: ReadonlyMap<PermissionScope['level'], ReadonlySet<PermissionCategory>>;
  /** XMPP JID — e.g. person.taylor@niagara.clark */
  readonly jid: string;
}

export interface AIAgentActor {
  readonly actorId: ActorId;
  readonly type: ActorType.AIAgent;
  readonly agentId: AgentId;
  readonly roles: ReadonlyArray<Role>;
  readonly effectivePermissions: ReadonlyMap<PermissionScope['level'], ReadonlySet<PermissionCategory>>;
  readonly allowedActionClasses: ReadonlyArray<AgentActionClass>;
  /** XMPP JID — e.g. agent.summary01@niagara.clark */
  readonly jid: string;
}

export interface AutomationServiceActor {
  readonly actorId: ActorId;
  readonly type: ActorType.AutomationService;
  readonly serviceId: AutomationServiceId;
  readonly roles: ReadonlyArray<Role>;
  readonly effectivePermissions: ReadonlyMap<PermissionScope['level'], ReadonlySet<PermissionCategory>>;
  /** XMPP JID — e.g. svc.adapter.scope01@niagara.clark */
  readonly jid: string;
}

export type Actor = HumanActor | AIAgentActor | AutomationServiceActor;

/** Narrow helper — use inside route handlers after checking actor.type */
export function isHuman(actor: Actor): actor is HumanActor {
  return actor.type === ActorType.HumanUser;
}

export function isAIAgent(actor: Actor): actor is AIAgentActor {
  return actor.type === ActorType.AIAgent;
}

export function isAutomation(actor: Actor): actor is AutomationServiceActor {
  return actor.type === ActorType.AutomationService;
}

/** Resolve the typed ref ID for any actor — used in event attribution */
export function actorRefId(actor: Actor): string {
  switch (actor.type) {
    case ActorType.HumanUser:         return actor.personId;
    case ActorType.AIAgent:           return actor.agentId;
    case ActorType.AutomationService: return actor.serviceId;
  }
}
