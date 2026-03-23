import type { FastifyInstance } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, asId } from '@clark/core';
import type { IssueId, FacilityId } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const eventStore = new EventStore();

export default async function issuesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { facilityId?: string; jobId?: string; status?: string } }>(
    '/issues',
    async (request) => {
      const { facilityId, jobId, status } = request.query;

      if (facilityId && !can(request.actor, PermissionCategory.View, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      let sql = `SELECT id, facility_id, workstation_id, job_id, title, issue_type, severity, status,
                        opened_by_actor_id, escalated_to_actor_id, created_at, updated_at
                 FROM issues WHERE deleted_at IS NULL`;
      const params: unknown[] = [];

      if (facilityId) { params.push(facilityId); sql += ` AND facility_id = $${params.length}`; }
      if (jobId)      { params.push(jobId);      sql += ` AND job_id = $${params.length}`; }
      if (status)     { params.push(status);     sql += ` AND status = $${params.length}`; }

      sql += ' ORDER BY created_at DESC';
      return query(sql, params);
    },
  );

  fastify.get<{ Params: { id: string } }>('/issues/:id', async (request) => {
    const row = await queryOne<{ id: string; facility_id: string; status: string; severity: string }>(
      `SELECT id, facility_id, workstation_id, job_id, task_id, title, description,
              issue_type, severity, status, resolution,
              opened_by_actor_id, escalated_to_actor_id,
              resolved_at, created_at, updated_at
       FROM issues WHERE id = $1 AND deleted_at IS NULL`,
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
      facilityId: string;
      workstationId?: string;
      jobId?: string;
      taskId?: string;
      title: string;
      description: string;
      issueType?: string;
      severity: string;
    };
  }>(
    '/issues',
    {
      schema: {
        body: {
          type: 'object',
          required: ['facilityId', 'title', 'description', 'severity'],
          properties: {
            facilityId:    { type: 'string', minLength: 1 },
            workstationId: { type: 'string' },
            jobId:         { type: 'string' },
            taskId:        { type: 'string' },
            title:         { type: 'string', minLength: 1 },
            description:   { type: 'string', minLength: 1 },
            issueType:     { type: 'string' },
            severity:      { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { facilityId, workstationId, jobId, taskId, title, description, issueType = 'general', severity } = request.body;

      if (!can(request.actor, PermissionCategory.CreateNote, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      const id = uuidv7();
      const actorId = request.actor.actorId;

      await query(
        `INSERT INTO issues (id, facility_id, workstation_id, job_id, task_id, title, description,
                             issue_type, severity, status, opened_by_actor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)`,
        [id, facilityId, workstationId ?? null, jobId ?? null, taskId ?? null,
         title, description, issueType, severity, actorId],
      );

      const issueId = asId<IssueId>(id);
      const event = {
        id: uuidv7(),
        type: 'issue.opened' as const,
        facilityId: asId<FacilityId>(facilityId),
        workstationId: null,
        jobId: null,
        issueId,
        conversationId: null,
        actor: { actorId, type: request.actor.type },
        occurredAt: new Date(),
        recordedAt: new Date(),
        sourceType: 'human_ui' as const,
        correlationId: null,
        causationId: null,
        artifactRefs: [],
        retentionClass: 'operational' as const,
        metadata: {},
        payload: { issueId, title, issueType, severity, openedByActorId: actorId },
      };

      await eventStore.append(`issue:${id}`, -1, [event]);
      broadcastEvent(event);

      return reply.status(201).send({ id });
    },
  );

  fastify.patch<{
    Params: { id: string };
    Body: { status?: string; resolution?: string; escalateToActorId?: string };
  }>(
    '/issues/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            status:             { type: 'string', enum: ['investigating', 'escalated', 'resolved', 'closed'] },
            resolution:         { type: 'string' },
            escalateToActorId:  { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { status, resolution, escalateToActorId } = request.body;

      const existing = await queryOne<{ facility_id: string; status: string }>(
        'SELECT facility_id, status FROM issues WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!existing) throw notFound();

      if (!can(request.actor, PermissionCategory.ApproveDisposition, { level: 'facility', facilityId: existing.facility_id })) {
        throw forbidden();
      }

      const updates: string[] = [];
      const params: unknown[] = [];

      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
        if (status === 'resolved') {
          updates.push('resolved_at = now()');
        }
      }
      if (resolution) {
        params.push(resolution);
        updates.push(`resolution = $${params.length}`);
      }
      if (escalateToActorId) {
        params.push(escalateToActorId);
        updates.push(`escalated_to_actor_id = $${params.length}`);
      }

      if (updates.length === 0) throw badRequest('No fields to update');

      updates.push('updated_at = now()');
      params.push(id);
      await query(
        `UPDATE issues SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params,
      );

      return { ok: true };
    },
  );
}
