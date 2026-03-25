import type { ZoneId, FacilityId, WorkstationId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { ZoneType } from '../common/enums.js';

export type ZoneStatus = 'active' | 'inactive';

export interface Zone extends SoftDeletable {
  readonly id: ZoneId;
  readonly facilityId: FacilityId;
  readonly name: string;
  readonly zoneType: ZoneType;
  readonly status: ZoneStatus;
  readonly description: string | null;
  readonly workstationIds: ReadonlyArray<WorkstationId>;
  readonly metadata: Record<string, unknown>;
}

export type ZoneCreateInput = Omit<Zone, 'id' | 'workstationIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type ZoneUpdateInput = Partial<Pick<Zone, 'name' | 'zoneType' | 'status' | 'description' | 'metadata'>> & { readonly id: ZoneId };
