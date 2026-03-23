import type { FacilityId, ZoneId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export interface Facility extends SoftDeletable {
  readonly id: FacilityId;
  readonly name: string;
  readonly address: string | null;
  readonly timezone: string;
  readonly zoneIds: ReadonlyArray<ZoneId>;
  readonly metadata: Record<string, unknown>;
}

export type FacilityCreateInput = Omit<Facility, 'id' | 'zoneIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type FacilityUpdateInput = Partial<FacilityCreateInput> & { readonly id: FacilityId };
