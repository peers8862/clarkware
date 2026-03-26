/**
 * Shared types for domain service classes.
 * These are the minimal interfaces that services need — not the full Fastify request types.
 */
import type { ActorId } from '@clark/core';

/** The authenticated actor calling a service method. */
export interface Actor {
  actorId: ActorId;
  type: string;
  roles?: string[];
  permissionGrants?: unknown[];
}
