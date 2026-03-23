import type { AutomationServiceId, ActorId, FacilityId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { AutomationServiceType, AdapterStatus } from '../common/enums.js';

export interface AutomationService extends SoftDeletable {
  readonly id: AutomationServiceId;
  /** FK to unified actors table */
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly serviceType: AutomationServiceType;
  readonly status: AdapterStatus;
  /** Facility this service is scoped to — null means platform-wide */
  readonly facilityScope: FacilityId | null;
  readonly xmppJid: string | null;
  readonly metadata: Record<string, unknown>;
}

export type AutomationServiceCreateInput = Omit<AutomationService, 'id' | 'actorId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type AutomationServiceUpdateInput =
  Partial<Pick<AutomationService, 'displayName' | 'serviceType' | 'status' | 'facilityScope' | 'xmppJid' | 'metadata'>>
  & { readonly id: AutomationServiceId };
