import type { AgentId, ActorId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { AgentType, AgentActionClass } from '../common/enums.js';

export type AgentStatus = 'active' | 'inactive' | 'error';

export interface Agent extends SoftDeletable {
  readonly id: AgentId;
  /** FK to unified actors table */
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly agentType: AgentType;
  readonly operatorOrg: string | null;
  readonly status: AgentStatus;
  /** Explicit list of action classes this agent is permitted to perform */
  readonly allowedActionClasses: ReadonlyArray<AgentActionClass>;
  readonly modelId: string | null;
  readonly xmppJid: string | null;
  readonly metadata: Record<string, unknown>;
}

export type AgentCreateInput = Omit<Agent, 'id' | 'actorId' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type AgentUpdateInput =
  Partial<Pick<Agent, 'displayName' | 'agentType' | 'status' | 'allowedActionClasses' | 'modelId' | 'xmppJid' | 'metadata'>>
  & { readonly id: AgentId };
