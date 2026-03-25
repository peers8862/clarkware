import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '@clark/identity';
import { queryOne } from '@clark/db';
import { ActorType, Role } from '@clark/core';
import type { Actor, ActorId, PersonId, AgentId, AutomationServiceId } from '@clark/core';
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

    const actorType = payload.actorType ?? ActorType.HumanUser;

    // All actor types load from the unified actors table
    const actor = await queryOne<{ id: string; is_active: boolean; xmpp_jid: string | null }>(
      'SELECT id, is_active, xmpp_jid FROM actors WHERE id = $1',
      [payload.sub],
    );
    if (!actor || !actor.is_active) throw unauthorized('Actor not found or inactive');

    const roles = (payload.roles as string[]).filter(
      (r): r is Role => Object.values(Role).includes(r as Role),
    );

    switch (actorType) {
      case ActorType.HumanUser: {
        const person = await queryOne<{ id: string }>(
          'SELECT id FROM persons WHERE id = $1 AND deleted_at IS NULL',
          [payload.sub],
        );
        if (!person) throw unauthorized('Person not found');

        request.actor = {
          actorId: payload.sub as ActorId,
          type: ActorType.HumanUser,
          personId: person.id as PersonId,
          roles,
          effectivePermissions: new Map(),
          jid: actor.xmpp_jid ?? '',
        };
        break;
      }

      case ActorType.AIAgent: {
        request.actor = {
          actorId: payload.sub as ActorId,
          type: ActorType.AIAgent,
          agentId: payload.sub as AgentId,
          roles,
          effectivePermissions: new Map(),
          allowedActionClasses: [],
          jid: actor.xmpp_jid ?? '',
        };
        break;
      }

      case ActorType.AutomationService: {
        request.actor = {
          actorId: payload.sub as ActorId,
          type: ActorType.AutomationService,
          serviceId: payload.sub as AutomationServiceId,
          roles,
          effectivePermissions: new Map(),
          jid: actor.xmpp_jid ?? '',
        };
        break;
      }

      default:
        throw unauthorized('Unknown actor type');
    }
  });
});
