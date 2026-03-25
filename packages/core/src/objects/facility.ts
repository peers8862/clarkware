import type { FacilityId, ZoneId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';

export type FacilityStatus = 'active' | 'inactive' | 'decommissioned';

export interface Facility extends SoftDeletable {
  readonly id: FacilityId;
  readonly name: string;
  /** Short uppercase code used in human-readable IDs e.g. "NIAGARA" */
  readonly code: string;
  readonly timezone: string;
  /** Jurisdiction code for retention rules e.g. "ON-CA" */
  readonly jurisdiction: string;
  readonly status: FacilityStatus;
  readonly ownerOrg: string | null;
  readonly zoneIds: ReadonlyArray<ZoneId>;
  /** Facility-scoped XMPP domain e.g. "niagara.clark" */
  readonly xmppDomain: string;
  readonly metadata: Record<string, unknown>;
}

export type FacilityCreateInput = Omit<Facility, 'id' | 'zoneIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type FacilityUpdateInput =
  Partial<Pick<Facility, 'name' | 'code' | 'timezone' | 'jurisdiction' | 'status' | 'ownerOrg' | 'xmppDomain' | 'metadata'>>
  & { readonly id: FacilityId };
