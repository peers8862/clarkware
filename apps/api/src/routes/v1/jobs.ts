import type { FastifyInstance } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, asId } from '@clark/core';
import type { ActorType, JobId, FacilityId, ZoneId, WorkstationId } from '@clark/core';
import { notFound, forbidden, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const eventStore = new EventStore();

export default async function jobsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/jobs', async (request) => {
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
      throw forbidden();
    }
    const rows = await query<{ id: string; name: string; status: string; facility_id: string; created_at: Date }>(
      'SELECT id, name, status, facility_id, created_at FROM jobs WHERE deleted_at IS NULL ORDER BY created_at DESC',
    );
    return rows;
  });

  fastify.get<{ Params: { id: string } }>('/jobs/:id', async (request) => {
    const row = await queryOne<{ id: string; name: string; status: string; facility_id: string; zone_id: string; workstation_id: string; description: string | null; assigned_person_id: string | null; created_at: Date; updated_at: Date }>(
      'SELECT id, name, status, facility_id, zone_id, workstation_id, description, assigned_person_id, created_at, updated_at FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [request.params.id],
    );
    if (!row) throw notFound();
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: row.facility_id })) {
      throw forbidden();
    }
    return row;
  });

  fastify.post<{ Body: { name: string; facilityId: string; zoneId: string; workstationId: string; description?: string } }>(
    '/jobs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'facilityId', 'zoneId', 'workstationId'],
          properties: {
            name:           { type: 'string', minLength: 1 },
            facilityId:     { type: 'string', minLength: 1 },
            zoneId:         { type: 'string', minLength: 1 },
            workstationId:  { type: 'string', minLength: 1 },
            description:    { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, facilityId, zoneId, workstationId, description = null } = request.body;
      if (!can(request.actor, PermissionCategory.CreateNote, { level: 'facility', facilityId })) {
        throw forbidden();
      }
      const id = uuidv7();
      await query(
        `INSERT INTO jobs (id, facility_id, zone_id, workstation_id, name, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft')`,
        [id, facilityId, zoneId, workstationId, name, description],
      );
      return reply.status(201).send({ id, name, status: 'draft', facilityId, zoneId, workstationId, description });
    },
  );

  fastify.post<{ Params: { id: string } }>('/jobs/:id/start', {}, async (request, reply) => {
    const job = await queryOne<{ id: string; status: string; facility_id: string; zone_id: string; workstation_id: string }>(
      'SELECT id, status, facility_id, zone_id, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [request.params.id],
    );
    if (!job) throw notFound();
    if (job.status !== 'draft') throw badRequest('Job must be in draft status to start');

    const now = new Date();
    await query(
      "UPDATE jobs SET status = 'active', started_at = $1, updated_at = $1 WHERE id = $2",
      [now, job.id],
    );

    const actorId = 'personId' in request.actor ? request.actor.personId : request.actor.agentId;
    const versionResult = await queryOne<{ max_seq: string | null }>(
      'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
      [`job:${job.id}`],
    );
    const currentVersion = versionResult?.max_seq != null ? Number(versionResult.max_seq) : -1;

    const event = {
      id: asId(uuidv7()),
      type: 'job.started' as const,
      occurredAt: now,
      actor: { type: request.actor.type as ActorType, id: actorId as string },
      correlationId: null,
      causationId: null,
      payload: {
        jobId: asId<JobId>(job.id),
        facilityId: asId<FacilityId>(job.facility_id),
        zoneId: asId<ZoneId>(job.zone_id),
        workstationId: asId<WorkstationId>(job.workstation_id),
        assignedPersonId: null,
      },
      metadata: {},
    };
    await eventStore.append(`job:${job.id}`, currentVersion, [event]);
    broadcastEvent(`job:${job.id}`, { ...event, streamId: `job:${job.id}`, sequenceNumber: currentVersion + 1 });

    return reply.status(200).send({ id: job.id, status: 'active' });
  });
}
