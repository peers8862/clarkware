import type { ToolId, FacilityId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type ToolConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface Tool extends SoftDeletable {
  readonly id: ToolId;
  readonly facilityId: FacilityId;
  readonly name: string;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly connectionStatus: ToolConnectionStatus;
  readonly lastSeenAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type ToolCreateInput = Omit<Tool, 'id' | 'connectionStatus' | 'lastSeenAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type ToolUpdateInput = Partial<Pick<Tool, 'name' | 'model' | 'serialNumber' | 'connectionStatus' | 'lastSeenAt' | 'metadata'>> & { readonly id: ToolId };
