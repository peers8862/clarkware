import type { WorkstationId, ZoneId, FacilityId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { AdapterStatus } from '../common/enums.js';

export type WorkstationStatus = 'active' | 'inactive' | 'maintenance';

export interface Workstation extends SoftDeletable {
  readonly id: WorkstationId;
  readonly facilityId: FacilityId;
  readonly zoneId: ZoneId;
  readonly name: string;
  /** Operational classification e.g. "diagnostics_test", "calibration_rig" */
  readonly stationType: string;
  readonly status: WorkstationStatus;
  readonly ipAddress: string | null;
  /** Device capabilities profile — free-form JSON */
  readonly deviceProfile: Record<string, unknown>;
  /** Adapter capabilities this station supports e.g. ["scope_export","camera_capture"] */
  readonly integrationProfile: ReadonlyArray<string>;
  readonly currentAdapterStatus: AdapterStatus | null;
  readonly metadata: Record<string, unknown>;
}

export type WorkstationCreateInput = Omit<Workstation, 'id' | 'currentAdapterStatus' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type WorkstationUpdateInput =
  Partial<Pick<Workstation, 'name' | 'stationType' | 'status' | 'ipAddress' | 'deviceProfile' | 'integrationProfile' | 'currentAdapterStatus' | 'metadata'>>
  & { readonly id: WorkstationId };
