import type { FastifyInstance } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, asId } from '@clark/core';
import type { NoteId, JobId, TaskId } from '@clark/core';
import type { ActorType } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

interface CreateNoteBody {
  jobId: string;
  taskId?: string;
  body: string;
}

const eventStore = new EventStore();

export default async function notesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CreateNoteBody }>(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'body'],
          properties: {
            jobId:  { type: 'string', minLength: 1 },
            taskId: { type: 'string' },
            body:   { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId: rawJobId, taskId: rawTaskId, body: noteBody } = request.body;
      const actor = request.actor;

      if (!can(actor, PermissionCategory.CreateNote, { level: 'job', jobId: rawJobId })) {
        throw forbidden('You do not have permission to create notes on this job');
      }

      // Validate job exists and is active
      const job = await queryOne<{ id: string; status: string }>(
        'SELECT id, status FROM jobs WHERE id = $1 AND deleted_at IS NULL',
        [rawJobId],
      );

      if (!job) throw notFound(`Job ${rawJobId} not found`);
      if (job.status !== 'active') {
        throw badRequest(`Cannot add notes to a job with status '${job.status}'`);
      }

      // Validate task if provided
      if (rawTaskId) {
        const task = await queryOne<{ id: string }>(
          'SELECT id FROM tasks WHERE id = $1 AND job_id = $2 AND deleted_at IS NULL',
          [rawTaskId, rawJobId],
        );
        if (!task) throw notFound(`Task ${rawTaskId} not found on job ${rawJobId}`);
      }

      const noteId = uuidv7() as NoteId;
      const jobId = asId<JobId>(rawJobId);
      const taskId = rawTaskId ? asId<TaskId>(rawTaskId) : null;
      const authorId = 'personId' in actor ? actor.personId : (actor.agentId as unknown as string);
      const now = new Date();

      // Insert note into relational DB
      await query(
        `INSERT INTO notes (id, job_id, task_id, body, author_id, revision_number, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $6)`,
        [noteId, jobId, taskId, noteBody, authorId, now],
      );

      // Get current event stream version
      const versionResult = await queryOne<{ max_seq: string | null }>(
        'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
        [`job:${rawJobId}`],
      );
      const currentVersion =
        versionResult?.max_seq != null ? Number(versionResult.max_seq) : -1;

      // Build the domain event
      const actorId = 'personId' in actor ? actor.personId : actor.agentId;
      const event = {
        id: asId(uuidv7()),
        type: 'note.created' as const,
        occurredAt: now,
        actor: { type: actor.type as ActorType, id: actorId as string },
        correlationId: null,
        causationId: null,
        payload: { noteId, jobId, taskId, body: noteBody },
        metadata: {},
      };

      // Append to event store
      await eventStore.append(`job:${rawJobId}`, currentVersion, [event]);

      // Fan out to WebSocket subscribers (fire-and-forget — no await on DB)
      broadcastEvent(`job:${rawJobId}`, {
        ...event,
        streamId: `job:${rawJobId}`,
        sequenceNumber: currentVersion + 1,
      });

      return reply.status(201).send({
        id: noteId,
        jobId,
        taskId,
        body: noteBody,
        authorId,
        revisionNumber: 1,
        createdAt: now,
        updatedAt: now,
      });
    },
  );
}
