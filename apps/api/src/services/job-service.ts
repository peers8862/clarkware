/**
 * JobService — domain service for the Jobs bounded context.
 *
 * Microservices principles applied here:
 * - All job business logic lives in this class, not in route handlers
 * - All DB access (reads and writes) goes through this class for the jobs context
 * - Domain events are appended and CFX outbox messages are written in the same transaction
 * - No direct imports of other bounded contexts' internals
 * - Route handlers are thin adapters that call this service and return HTTP responses
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, withTransaction } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, SourceType, asId } from '@clark/core';
import type { JobId, FacilityId, WorkstationId, EventId, ArtifactId, ActorId } from '@clark/core';
import type { Actor } from './types.js';
import { writeToOutbox } from '@clark/cfx';
import { CFX_MESSAGES } from '@clark/cfx';

const eventStore = new EventStore();

// ─── Query types ────────────────────────────────────────────────────────────

export interface JobRow {
  id: string;
  title: string;
  status: string;
  facility_id: string;
  zone_id: string;
  workstation_id: string;
  description: string | null;
  job_type: string;
  priority: string;
  human_ref: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface JobSummaryRow {
  id: string;
  title: string;
  status: string;
  facility_id: string;
  workstation_id: string;
  job_type: string;
  priority: string;
  human_ref: string | null;
  created_at: Date;
}

export interface CreateJobInput {
  title: string;
  facilityId: string;
  zoneId: string;
  workstationId: string;
  description?: string;
  jobType?: string;
  priority?: string;
  humanRef?: string;
}

export interface UpdateJobInput {
  status?: 'paused' | 'completed' | 'voided';
  title?: string;
  description?: string;
  priority?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class JobService {
  private readonly cfxHandle: string;

  constructor(cfxHandle = process.env.CLARK_CFX_HANDLE ?? 'clark.ipe.dev') {
    this.cfxHandle = cfxHandle;
  }

  async listJobs(actor: Actor): Promise<JobSummaryRow[]> {
    if (!can(actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    return query<JobSummaryRow>(
      `SELECT id, title, status, facility_id, workstation_id, job_type, priority, human_ref, created_at
       FROM jobs WHERE deleted_at IS NULL ORDER BY created_at DESC`,
    );
  }

  async getJob(actor: Actor, jobId: string): Promise<JobRow> {
    const row = await queryOne<JobRow>(
      `SELECT id, title, status, facility_id, zone_id, workstation_id, description,
              job_type, priority, human_ref, created_at, updated_at
       FROM jobs WHERE id = $1 AND deleted_at IS NULL`,
      [jobId],
    );
    if (!row) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (!can(actor, PermissionCategory.View, { level: 'facility', facilityId: row.facility_id })) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    return row;
  }

  async createJob(actor: Actor, input: CreateJobInput): Promise<{ id: string; title: string; status: string }> {
    if (!can(actor, PermissionCategory.CreateNote, { level: 'facility', facilityId: input.facilityId })) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
    const id = uuidv4();
    await query(
      `INSERT INTO jobs (id, facility_id, zone_id, workstation_id, title, description, job_type, priority, human_ref, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')`,
      [id, input.facilityId, input.zoneId, input.workstationId, input.title,
       input.description ?? null, input.jobType ?? 'general', input.priority ?? 'medium', input.humanRef ?? null],
    );
    return { id, title: input.title, status: 'draft' };
  }

  async startJob(actor: Actor, jobId: string): Promise<{ id: string; status: string }> {
    const job = await queryOne<{ id: string; status: string; facility_id: string; workstation_id: string }>(
      'SELECT id, status, facility_id, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (!job) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (job.status !== 'draft') throw Object.assign(new Error('Job must be in draft status to start'), { statusCode: 400 });

    const now = new Date();

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE jobs SET status = 'active', opened_at = $1, updated_at = $1 WHERE id = $2",
        [now, job.id],
      );

      const version = await this.currentVersion(jobId);
      const event = this.buildEvent('job.started', actor, job, now, version, {
        jobId: asId<JobId>(job.id),
        assignedActorId: actor.actorId,
      });
      await eventStore.appendWithClient(client, `job:${job.id}`, version, [event]);

      await writeToOutbox(client, this.cfxHandle, CFX_MESSAGES.WORK_ORDER_STARTED, {
        WorkOrderIdentifier: job.id,
        WorkOrderStartedInfo: {
          WorkOrderIdentifier: job.id,
          WorkstationIdentifier: job.workstation_id,
          OperatorIdentifier: actor.actorId,
        },
      });

      return event;
    });

    return { id: job.id, status: 'active' };
  }

  async resumeJob(actor: Actor, jobId: string): Promise<{ id: string; status: string }> {
    const job = await queryOne<{ id: string; status: string; facility_id: string; workstation_id: string }>(
      'SELECT id, status, facility_id, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (!job) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (job.status !== 'paused') throw Object.assign(new Error('Job must be paused to resume'), { statusCode: 400 });

    const now = new Date();
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE jobs SET status = 'active', updated_at = $1 WHERE id = $2",
        [now, job.id],
      );
      const version = await this.currentVersion(jobId);
      const event = this.buildEvent('job.resumed', actor, job, now, version, { jobId: asId<JobId>(job.id) });
      await eventStore.appendWithClient(client, `job:${job.id}`, version, [event]);
    });

    return { id: job.id, status: 'active' };
  }

  async reopenJob(actor: Actor, jobId: string): Promise<{ id: string; status: string }> {
    const job = await queryOne<{ id: string; status: string; facility_id: string; workstation_id: string }>(
      'SELECT id, status, facility_id, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (!job) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    if (job.status !== 'completed' && job.status !== 'voided') {
      throw Object.assign(new Error('Only completed or voided jobs can be reopened'), { statusCode: 400 });
    }

    const now = new Date();
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE jobs SET status = 'draft', closed_at = NULL, updated_at = $1 WHERE id = $2",
        [now, job.id],
      );
      const version = await this.currentVersion(jobId);
      const event = this.buildEvent('job.reopened', actor, job, now, version, { jobId: asId<JobId>(job.id) });
      await eventStore.appendWithClient(client, `job:${job.id}`, version, [event]);
    });

    return { id: job.id, status: 'draft' };
  }

  async updateJob(actor: Actor, jobId: string, input: UpdateJobInput): Promise<{ ok: boolean }> {
    const job = await queryOne<{ facility_id: string; status: string; workstation_id: string }>(
      'SELECT facility_id, status, workstation_id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [jobId],
    );
    if (!job) throw Object.assign(new Error('Not found'), { statusCode: 404 });

    if (input.status) {
      if (!can(actor, PermissionCategory.ApproveDisposition, { level: 'facility', facilityId: job.facility_id })) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      }
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE jobs SET status = $1,
           closed_at = CASE WHEN $1 IN ('completed','voided') THEN now() ELSE NULL END,
           updated_at = now() WHERE id = $2`,
          [input.status, jobId],
        );

        if (input.status === 'completed') {
          const version = await this.currentVersion(jobId);
          const event = this.buildEvent('job.completed', actor, { id: jobId, ...job }, new Date(), version, {
            jobId: asId<JobId>(jobId),
          });
          await eventStore.appendWithClient(client, `job:${jobId}`, version, [event]);

          await writeToOutbox(client, this.cfxHandle, CFX_MESSAGES.WORK_ORDER_COMPLETED, {
            WorkOrderIdentifier: jobId,
            WorkOrderCompletedInfo: {
              WorkOrderIdentifier: jobId,
              FinalStatus: 'Completed',
              OperatorIdentifier: actor.actorId,
            },
          });
        }
      });
    }

    if (input.title !== undefined || input.description !== undefined || input.priority !== undefined) {
      if (!can(actor, PermissionCategory.View, { level: 'facility', facilityId: job.facility_id })) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      }
      const sets: string[] = ['updated_at = now()'];
      const params: unknown[] = [];
      let i = 1;
      if (input.title !== undefined)       { sets.push(`title = $${i++}`);       params.push(input.title); }
      if (input.description !== undefined) { sets.push(`description = $${i++}`); params.push(input.description); }
      if (input.priority !== undefined)    { sets.push(`priority = $${i++}`);    params.push(input.priority); }
      params.push(jobId);
      await query(`UPDATE jobs SET ${sets.join(', ')} WHERE id = $${i}`, params);
    }

    return { ok: true };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async currentVersion(jobId: string): Promise<number> {
    const row = await queryOne<{ max_seq: string | null }>(
      'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
      [`job:${jobId}`],
    );
    return row?.max_seq != null ? Number(row.max_seq) : -1;
  }

  private buildEvent(
    type: string,
    actor: Actor,
    job: { id: string; facility_id: string; workstation_id: string },
    occurredAt: Date,
    version: number,
    payload: Record<string, unknown>,
  ) {
    return {
      id: asId<EventId>(uuidv4()),
      type: type as never,
      facilityId: asId<FacilityId>(job.facility_id),
      workstationId: asId<WorkstationId>(job.workstation_id),
      jobId: asId<JobId>(job.id),
      issueId: null,
      conversationId: null,
      streamId: `job:${job.id}`,
      sequenceNumber: version + 1,
      actor: { actorId: actor.actorId, type: actor.type },
      occurredAt,
      recordedAt: occurredAt,
      sourceType: SourceType.HumanUI,
      correlationId: null,
      causationId: null,
      artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
      retentionClass: 'operational' as const,
      metadata: {} as Record<string, unknown>,
      payload: payload as never,
    };
  }
}
