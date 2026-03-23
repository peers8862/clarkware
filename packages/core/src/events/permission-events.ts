import type { EventEnvelope } from './base-event.js';
import type { PermissionGrantId } from '../common/branded.js';

export type PermissionGrantedEvent = EventEnvelope<
  'permission.granted',
  { readonly permissionGrantId: PermissionGrantId; readonly actorId: string; readonly scopeLevel: string; readonly scopeId: string; readonly reason: string | null }
>;

export type PermissionRevokedEvent = EventEnvelope<
  'permission.revoked',
  { readonly permissionGrantId: PermissionGrantId; readonly revokedByActorId: string }
>;
