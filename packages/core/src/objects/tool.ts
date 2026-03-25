import type { ToolId, FacilityId, WorkstationId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { IntegrationMode, AdapterStatus } from '../common/enums.js';

export interface Tool extends SoftDeletable {
  readonly id: ToolId;
  readonly facilityId: FacilityId;
  readonly workstationId: WorkstationId | null;
  readonly name: string;
  readonly toolType: string;
  readonly vendor: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly integrationMode: IntegrationMode;
  readonly adapterStatus: AdapterStatus;
  readonly adapterConfig: Record<string, unknown>;
  readonly lastImportAt: Date | null;
  readonly lastErrorMessage: string | null;
  readonly metadata: Record<string, unknown>;
}

export type ToolCreateInput = Omit<Tool, 'id' | 'adapterStatus' | 'lastImportAt' | 'lastErrorMessage' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type ToolUpdateInput =
  Partial<Pick<Tool, 'name' | 'toolType' | 'vendor' | 'model' | 'serialNumber' | 'integrationMode' | 'adapterStatus' | 'adapterConfig' | 'lastImportAt' | 'lastErrorMessage' | 'metadata'>>
  & { readonly id: ToolId };
