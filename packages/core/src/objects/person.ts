import type { PersonId, ActorId, FacilityId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { Role } from '../identity/roles.js';

export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'remote_expert';
export type PersonStatus = 'active' | 'inactive' | 'suspended';

export interface Person extends SoftDeletable {
  readonly id: PersonId;
  /** FK to unified actors table */
  readonly actorId: ActorId;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly passwordHash: string;
  readonly roles: ReadonlyArray<Role>;
  readonly employmentType: EmploymentType;
  readonly facilityAffiliation: FacilityId | null;
  readonly status: PersonStatus;
  readonly xmppJid: string | null;
  readonly lastLoginAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type PersonCreateInput = Omit<Person, 'id' | 'actorId' | 'lastLoginAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type PersonUpdateInput =
  Partial<Pick<Person, 'displayName' | 'email' | 'roles' | 'employmentType' | 'facilityAffiliation' | 'status' | 'xmppJid' | 'metadata'>>
  & { readonly id: PersonId };
