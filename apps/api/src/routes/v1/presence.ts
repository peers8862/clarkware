import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { can } from '@clark/identity';
import { PermissionCategory, PresenceStateValue, SourceType, asId } from '@clark/core';
import type { EventId, ActorId, WorkstationId, ArtifactId } from '@clark/core';
import { forbidden, notFound } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

export default async function presenceRoutes(fastify: FastifyInstance): Promise<void> {
  // Get presence state for a workstation
  fastify.get<{ Params: { workstationId: string } }>(
    '/workstations/:workstationId/presence',
    async (request) => {
      const { workstationId } = request.params;

      const ws = await queryOne<{ facility_id: string }>(
        'SELECT facility_id FROM workstations WHERE id = $1 AND deleted_at IS NULL',
        [workstationId],
      );
      if (!ws) throw notFound();

      if (!can(request.actor, PermissionCategory.View, { level: 'workstation', workstationId })) {
        throw forbidden();
      }

      return query(
        `SELECT ps.actor_id, ps.state, ps.status_message, ps.updated_at,
                a.actor_type, a.xmpp_jid
         FROM presence_states ps
         JOIN actors a ON a.id = ps.actor_id
         WHERE ps.workstation_id = $1`,
        [workstationId],
      );
    },
  );

  // Get presence for the current actor across all workstations
  fastify.get('/me/presence', async (request) => {
    return query(
      `SELECT ps.workstation_id, ps.state, ps.status_message, ps.updated_at,
              w.name AS workstation_name, w.facility_id
       FROM presence_states ps
       JOIN workstations w ON w.id = ps.workstation_id
       WHERE ps.actor_id = $1`,
      [request.actor.actorId],
    );
  });

  // Upsert presence state (actor sets their own presence)
  fastify.put<{
    Params: { workstationId: string };
    Body: { state: string; statusMessage?: string };
  }>(
    '/workstations/:workstationId/presence',
    {
      schema: {
        params: { type: 'object', properties: { workstationId: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['state'],
          properties: {
            state:         { type: 'string', enum: Object.values(PresenceStateValue) },
            statusMessage: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { workstationId } = request.params;
      const { state, statusMessage } = request.body;

      const ws = await queryOne<{ id: string }>(
        'SELECT id FROM workstations WHERE id = $1 AND deleted_at IS NULL',
        [workstationId],
      );
      if (!ws) throw notFound();

      const actorId = request.actor.actorId;

      await query(
        `INSERT INTO presence_states (actor_id, workstation_id, state, status_message, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (actor_id, workstation_id)
         DO UPDATE SET state = $3, status_message = $4, updated_at = now()`,
        [actorId, workstationId, state, statusMessage ?? null],
      );

      broadcastEvent({
        id: asId<EventId>(uuidv4()),
        type: 'presence.changed',
        workstationId: asId<WorkstationId>(workstationId),
        facilityId: null,
        jobId: null,
        issueId: null,
        conversationId: null,
        streamId: `presence:${workstationId}`,
        sequenceNumber: 0,
        actor: { actorId, type: request.actor.type },
        occurredAt: new Date(),
        recordedAt: new Date(),
        sourceType: SourceType.HumanUI,
        correlationId: null,
        causationId: null,
        artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
        retentionClass: 'transient',
        metadata: {},
        payload: {
          actorId: asId<ActorId>(actorId),
          workstationId: asId<WorkstationId>(workstationId),
          fromState: null,
          toState: state as PresenceStateValue,
        },
      });

      return { ok: true };
    },
  );

  // Remove presence (leave workstation)
  fastify.delete<{ Params: { workstationId: string } }>(
    '/workstations/:workstationId/presence',
    async (request) => {
      const { workstationId } = request.params;
      await query(
        'DELETE FROM presence_states WHERE actor_id = $1 AND workstation_id = $2',
        [request.actor.actorId, workstationId],
      );
      return { ok: true };
    },
  );
}
