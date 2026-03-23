import type { PersonId, AgentId } from '../common/branded.js';
import type { Role, ActorType } from './roles.js';
import type { PermissionCategory, PermissionScope } from './permissions.js';

export interface HumanActor {
  readonly type: ActorType.HumanUser;
  readonly personId: PersonId;
  readonly roles: ReadonlyArray<Role>;
  readonly effectivePermissions: ReadonlyMap<PermissionScope['level'], ReadonlySet<PermissionCategory>>;
}

export interface AgentActor {
  readonly type: ActorType.AIAgent | ActorType.AutomationService;
  readonly agentId: AgentId;
  readonly roles: ReadonlyArray<Role>;
  readonly effectivePermissions: ReadonlyMap<PermissionScope['level'], ReadonlySet<PermissionCategory>>;
}

export type Actor = HumanActor | AgentActor;
