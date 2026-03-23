import type { AgentId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { ActorType } from '../identity/roles.js';

export type AgentStatus = 'active' | 'inactive' | 'error';

export interface Agent extends SoftDeletable {
  readonly id: AgentId;
  readonly name: string;
  readonly type: ActorType.AIAgent | ActorType.AutomationService;
  readonly status: AgentStatus;
  readonly capabilities: ReadonlyArray<string>;
  readonly modelId: string | null;
  readonly metadata: Record<string, unknown>;
}

export type AgentCreateInput = Omit<Agent, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type AgentUpdateInput = Partial<Pick<Agent, 'name' | 'status' | 'capabilities' | 'modelId' | 'metadata'>> & { readonly id: AgentId };
