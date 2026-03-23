import type { PersonId } from '../common/branded.js';
import type { SoftDeletable } from '../common/timestamps.js';
import type { Role } from '../identity/roles.js';

export interface Person extends SoftDeletable {
  readonly id: PersonId;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly passwordHash: string;
  readonly roles: ReadonlyArray<Role>;
  readonly xmppJid: string | null;
  readonly lastLoginAt: Date | null;
  readonly metadata: Record<string, unknown>;
}

export type PersonCreateInput = Omit<Person, 'id' | 'lastLoginAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type PersonUpdateInput = Partial<Pick<Person, 'displayName' | 'email' | 'roles' | 'xmppJid' | 'metadata'>> & { readonly id: PersonId };
