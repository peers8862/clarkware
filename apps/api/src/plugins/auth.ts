import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '@clark/identity';
import { queryOne } from '@clark/db';
import { ActorType, Role } from '@clark/core';
import type { Actor } from '@clark/core';
import type { PersonId } from '@clark/core';
import { unauthorized } from '../errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor;
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('actor', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    // Load person from DB
    const person = await queryOne<{ id: string; roles: string }>(
      'SELECT id, roles FROM persons WHERE id = $1 AND deleted_at IS NULL',
      [payload.sub],
    );

    if (!person) throw unauthorized('User not found');

    const roles = (JSON.parse(person.roles) as string[]).filter(
      (r): r is Role => Object.values(Role).includes(r as Role),
    );

    request.actor = {
      type: ActorType.HumanUser,
      personId: person.id as PersonId,
      roles,
      effectivePermissions: new Map(),
    };
  });
});
