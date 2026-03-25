import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, SourceType, asId } from '@clark/core';
import type { FacilityId, WorkstationId, EventId, ArtifactId, ShiftId, ActorId, NoteId } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const eventStore = new EventStore();

export default async function shiftsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get active shifts for a workstation
  fastify.get<{ Params: { workstationId: string } }>(
    '/workstations/:workstationId/shifts',
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
        `SELECT id, facility_id, workstation_id, operator_actor_id, handoff_to_actor_id,
                handoff_note_id, started_at, ended_at
         FROM shifts
         WHERE workstation_id = $1
         ORDER BY started_at DESC
         LIMIT 20`,
        [workstationId],
      );
    },
  );

  // Start a shift
  fastify.post<{
    Body: { facilityId: string; workstationId: string };
  }>(
    '/shifts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['facilityId', 'workstationId'],
          properties: {
            facilityId:    { type: 'string', minLength: 1 },
            workstationId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { facilityId, workstationId } = request.body;

      if (!can(request.actor, PermissionCategory.View, { level: 'workstation', workstationId })) {
        throw forbidden();
      }

      // Only one active shift per actor per workstation
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM shifts WHERE operator_actor_id = $1 AND workstation_id = $2 AND ended_at IS NULL`,
        [request.actor.actorId, workstationId],
      );
      if (existing) throw badRequest('Actor already has an active shift at this workstation');

      const id = uuidv4();
      const now = new Date();

      await query(
        `INSERT INTO shifts (id, facility_id, workstation_id, operator_actor_id, started_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, facilityId, workstationId, request.actor.actorId, now],
      );

      const event = {
        id: asId<EventId>(uuidv4()),
        type: 'shift.started' as const,
        facilityId: asId<FacilityId>(facilityId),
        workstationId: asId<WorkstationId>(workstationId),
        jobId: null,
        issueId: null,
        conversationId: null,
        streamId: `shift:${id}`,
        sequenceNumber: 0,
        actor: { actorId: request.actor.actorId, type: request.actor.type },
        occurredAt: now,
        recordedAt: now,
        sourceType: SourceType.HumanUI,
        correlationId: null,
        causationId: null,
        artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
        retentionClass: 'operational' as const,
        metadata: {} as Record<string, unknown>,
        payload: { shiftId: asId<ShiftId>(id), workstationId: asId<WorkstationId>(workstationId), operatorActorId: request.actor.actorId as ActorId },
      };

      await eventStore.append(`shift:${id}`, -1, [event]);
      broadcastEvent(event);

      return reply.status(201).send({ id });
    },
  );

  // Hand off a shift
  fastify.post<{
    Params: { id: string };
    Body: { handoffToActorId: string; handoffNoteId?: string };
  }>(
    '/shifts/:id/handoff',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['handoffToActorId'],
          properties: {
            handoffToActorId: { type: 'string' },
            handoffNoteId:    { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { handoffToActorId, handoffNoteId } = request.body;

      const shift = await queryOne<{
        id: string; workstation_id: string; facility_id: string; operator_actor_id: string; ended_at: Date | null;
      }>(
        'SELECT id, workstation_id, facility_id, operator_actor_id, ended_at FROM shifts WHERE id = $1',
        [id],
      );
      if (!shift) throw notFound();
      if (shift.ended_at) throw badRequest('Shift already ended');
      if (shift.operator_actor_id !== request.actor.actorId) throw forbidden();

      const now = new Date();

      await query(
        `UPDATE shifts SET handoff_to_actor_id = $1, handoff_note_id = $2, ended_at = $3, updated_at = $3
         WHERE id = $4`,
        [handoffToActorId, handoffNoteId ?? null, now, id],
      );

      const event = {
        id: asId<EventId>(uuidv4()),
        type: 'shift.handed_off' as const,
        facilityId: asId<FacilityId>(shift.facility_id),
        workstationId: asId<WorkstationId>(shift.workstation_id),
        jobId: null,
        issueId: null,
        conversationId: null,
        streamId: `shift:${id}`,
        sequenceNumber: 1,
        actor: { actorId: request.actor.actorId, type: request.actor.type },
        occurredAt: now,
        recordedAt: now,
        sourceType: SourceType.HumanUI,
        correlationId: null,
        causationId: null,
        artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
        retentionClass: 'operational' as const,
        metadata: {} as Record<string, unknown>,
        payload: {
          shiftId: asId<ShiftId>(id),
          workstationId: asId<WorkstationId>(shift.workstation_id),
          fromActorId: asId<ActorId>(shift.operator_actor_id),
          toActorId: asId<ActorId>(handoffToActorId),
          handoffNoteId: handoffNoteId ? asId<NoteId>(handoffNoteId) : null,
        },
      };

      await eventStore.append(`shift:${id}`, 0, [event]);
      broadcastEvent(event);

      return { ok: true };
    },
  );
}
