import type { WorkstationId, ZoneId, FacilityId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type WorkstationType = 'physical' | 'virtual';

export interface Workstation extends SoftDeletable {
  readonly id: WorkstationId;
  readonly facilityId: FacilityId;
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly type: WorkstationType;
  readonly ipAddress: string | null;
  readonly metadata: Record<string, unknown>;
}

export type WorkstationCreateInput = Omit<Workstation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type WorkstationUpdateInput = Partial<WorkstationCreateInput> & { readonly id: WorkstationId };
