import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, SourceType, asId } from '@clark/core';
import type { JobId, FacilityId, WorkstationId, EventId, ArtifactId } from '@clark/core';
import { notFound, forbidden, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const eventStore = new EventStore();

export default async function jobsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/jobs', async (request) => {
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
      throw forbidden();
    }
    return query(
      `SELECT id, title, status, facility_id, workstation_id, job_type, priority, human_ref, created_at
       FROM jobs WHERE deleted_at IS NULL ORDER BY created_at DESC`,
    );
  });

  fastify.get<{ Params: { id: string } }>('/jobs/:id', async (request) => {
    const row = await queryOne<{
      id: string; title: string; status: string; facility_id: string;
      zone_id: string; workstation_id: string; description: string | null;
      current_owner_actor_id: string | null; created_at: Date; updated_at: Date;
    }>(
      `SELECT id, title, status, facility_id, zone_id, workstation_id, description,
              current_owner_actor_id, created_at, updated_at
       FROM jobs WHERE id = $1 AND deleted_at IS NULL`,
      [request.params.id],
    );
    if (!row) throw notFound();
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: row.facility_id })) {
      throw forbidden();
    }
    return row;
  });

  fastify.post<{
    Body: {
      title: string;
      facilityId: string;
      zoneId: string;
      workstationId: string;
      description?: string;
      jobType?: string;
      priority?: string;
      humanRef?: string;
    };
  }>(
    '/jobs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'facilityId', 'zoneId', 'workstationId'],
          properties: {
            title:         { type: 'string', minLength: 1 },
            facilityId:    { type: 'string', minLength: 1 },
            zoneId:        { type: 'string', minLength: 1 },
            workstationId: { type: 'string', minLength: 1 },
            description:   { type: 'string' },
            jobType:       { type: 'string' },
            priority:      { type: 'string' },
            humanRef:      { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { title, facilityId, zoneId, workstationId, description = null, jobType = 'general', priority = 'medium', humanRef } = request.body;
      if (!can(request.actor, PermissionCategory.CreateNote, { level: 'facility', facilityId })) {
        throw forbidden();
      }
      const id = uuidv4();
      await query(
        `INSERT INTO jobs (id, facility_id, zone_id, workstation_id, title, description, job_type, priority, human_ref, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')`,
        [id, facilityId, zoneId, workstationId, title, description, jobType, priority, humanRef ?? null],
      );
      return reply.status(201).send({ id, title, status: 'draft' });
    },
  );

  fastify.post<{ Params: { id: string } }>('/jobs/:id/start', {}, async (request, reply) => {
    const job = await queryOne<{
      id: string; status: string; facility_id: string; zone_id: string; workstation_id: string;
    }>(
      'SELECT id, status, facility_id, zone_id, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [request.params.id],
    );
    if (!job) throw notFound();
    if (job.status !== 'draft') throw badRequest('Job must be in draft status to start');

    const now = new Date();
    await query(
      "UPDATE jobs SET status = 'active', opened_at = $1, updated_at = $1 WHERE id = $2",
      [now, job.id],
    );

    const versionResult = await queryOne<{ max_seq: string | null }>(
      'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
      [`job:${job.id}`],
    );
    const currentVersion = versionResult?.max_seq != null ? Number(versionResult.max_seq) : -1;

    const actor = request.actor;
    const event = {
      id: asId<EventId>(uuidv4()),
      type: 'job.started' as const,
      facilityId: asId<FacilityId>(job.facility_id),
      workstationId: asId<WorkstationId>(job.workstation_id),
      jobId: asId<JobId>(job.id),
      issueId: null,
      conversationId: null,
      streamId: `job:${job.id}`,
      sequenceNumber: currentVersion + 1,
      actor: { actorId: actor.actorId, type: actor.type },
      occurredAt: now,
      recordedAt: now,
      sourceType: SourceType.HumanUI,
      correlationId: null,
      causationId: null,
      artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
      retentionClass: 'operational' as const,
      metadata: {} as Record<string, unknown>,
      payload: {
        jobId: asId<JobId>(job.id),
        assignedActorId: actor.actorId,
      },
    };

    await eventStore.append(`job:${job.id}`, currentVersion, [event]);
    broadcastEvent(event);

    return reply.status(200).send({ id: job.id, status: 'active' });
  });

  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/jobs/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['paused', 'completed', 'voided'] } },
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { status } = request.body;
      const job = await queryOne<{ facility_id: string }>(
        'SELECT facility_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!job) throw notFound();
      if (!can(request.actor, PermissionCategory.ApproveDisposition, { level: 'facility', facilityId: job.facility_id })) {
        throw forbidden();
      }
      await query(
        `UPDATE jobs SET status = $1,
         closed_at = CASE WHEN $1 IN ('completed','voided') THEN now() ELSE NULL END,
         updated_at = now() WHERE id = $2`,
        [status, id],
      );
      return { ok: true };
    },
  );
}
