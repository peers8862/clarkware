import type { ZoneId, FacilityId, WorkstationId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export interface Zone extends SoftDeletable {
  readonly id: ZoneId;
  readonly facilityId: FacilityId;
  readonly name: string;
  readonly description: string | null;
  readonly workstationIds: ReadonlyArray<WorkstationId>;
  readonly metadata: Record<string, unknown>;
}

export type ZoneCreateInput = Omit<Zone, 'id' | 'workstationIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type ZoneUpdateInput = Partial<ZoneCreateInput> & { readonly id: ZoneId };
