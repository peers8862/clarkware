import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory, SourceType, NoteType, ReviewState, asId } from '@clark/core';
import type { NoteId, JobId, TaskId, IssueId, ActorId, WorkstationId, EventId, ArtifactId, RevisionChainId } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const eventStore = new EventStore();

export default async function notesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { jobId?: string; issueId?: string } }>(
    '/notes',
    async (request) => {
      const { jobId, issueId } = request.query;
      if (!jobId && !issueId) throw badRequest('jobId or issueId query param required');

      let sql = `SELECT id, revision_chain_id, job_id, task_id, issue_id, body, note_type,
                        author_actor_id, review_state, visibility_scope, created_at
                 FROM notes_current WHERE 1=1`;
      const params: unknown[] = [];

      if (jobId)   { params.push(jobId);   sql += ` AND job_id = $${params.length}`; }
      if (issueId) { params.push(issueId); sql += ` AND issue_id = $${params.length}`; }
      sql += ' ORDER BY created_at DESC';
      return query(sql, params);
    },
  );

  fastify.post<{
    Body: {
      jobId?: string;
      taskId?: string;
      issueId?: string;
      workstationId?: string;
      body: string;
      noteType?: string;
      visibilityScope?: string;
    };
  }>(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['body'],
          properties: {
            jobId:          { type: 'string' },
            taskId:         { type: 'string' },
            issueId:        { type: 'string' },
            workstationId:  { type: 'string' },
            body:           { type: 'string', minLength: 1 },
            noteType:       { type: 'string' },
            visibilityScope:{ type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId: rawJobId, taskId: rawTaskId, issueId: rawIssueId, workstationId: rawWsId, body: noteBody, noteType = NoteType.Observation, visibilityScope = 'job' } = request.body;
      const actor = request.actor;

      if (!rawJobId && !rawIssueId) throw badRequest('jobId or issueId required');

      const scope = rawJobId
        ? { level: 'job' as const, jobId: rawJobId }
        : { level: 'issue' as const, issueId: rawIssueId! };

      if (!can(actor, PermissionCategory.CreateNote, scope)) {
        throw forbidden();
      }

      // Validate job if provided
      if (rawJobId) {
        const job = await queryOne<{ id: string; status: string }>(
          'SELECT id, status FROM jobs WHERE id = $1 AND deleted_at IS NULL',
          [rawJobId],
        );
        if (!job) throw notFound('Job not found');
        if (job.status !== 'active') throw badRequest(`Cannot add notes to a job with status '${job.status}'`);
      }

      const noteId = uuidv4() as NoteId;
      const chainId = noteId; // first revision — chain ID = note ID
      const now = new Date();
      const authorActorId = actor.actorId as ActorId;

      await query(
        `INSERT INTO notes (id, revision_chain_id, job_id, task_id, issue_id, workstation_id,
                            body, note_type, author_actor_id, author_type, review_state, visibility_scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          noteId, chainId,
          rawJobId ?? null, rawTaskId ?? null, rawIssueId ?? null, rawWsId ?? null,
          noteBody, noteType, authorActorId, actor.type,
          ReviewState.NotRequired, visibilityScope,
        ],
      );

      // Append event to the job stream if there's a jobId
      if (rawJobId) {
        const versionResult = await queryOne<{ max_seq: string | null }>(
          'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
          [`job:${rawJobId}`],
        );
        const currentVersion = versionResult?.max_seq != null ? Number(versionResult.max_seq) : -1;

        const event = {
          id: asId<EventId>(uuidv4()),
          type: 'note.created' as const,
          facilityId: null,
          workstationId: rawWsId ? asId<WorkstationId>(rawWsId) : null,
          jobId: asId<JobId>(rawJobId),
          issueId: rawIssueId ? asId<IssueId>(rawIssueId) : null,
          conversationId: null,
          streamId: `job:${rawJobId}`,
          sequenceNumber: currentVersion + 1,
          actor: { actorId: authorActorId, type: actor.type },
          occurredAt: now,
          recordedAt: now,
          sourceType: SourceType.HumanUI,
          correlationId: null,
          causationId: null,
          artifactRefs: [] as unknown as ReadonlyArray<ArtifactId>,
          retentionClass: 'operational' as const,
          metadata: {} as Record<string, unknown>,
          payload: {
            noteId: asId<NoteId>(noteId),
            revisionChainId: asId<RevisionChainId>(chainId),
            jobId: asId<JobId>(rawJobId),
            taskId: rawTaskId ? asId<TaskId>(rawTaskId) : null,
            issueId: rawIssueId ? asId<IssueId>(rawIssueId) : null,
            noteType: noteType as NoteType,
            body: noteBody,
          },
        };

        await eventStore.append(`job:${rawJobId}`, currentVersion, [event]);
        broadcastEvent(event);
      }

      return reply.status(201).send({ id: noteId, revisionChainId: chainId, body: noteBody, createdAt: now });
    },
  );

  // Revise a note — creates a new record in the chain
  fastify.post<{
    Params: { id: string };
    Body: { body: string; reason?: string };
  }>(
    '/notes/:id/revise',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['body'],
          properties: {
            body:   { type: 'string', minLength: 1 },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { body: newBody } = request.body;

      const original = await queryOne<{
        id: string; revision_chain_id: string; job_id: string | null;
        task_id: string | null; issue_id: string | null; workstation_id: string | null;
        note_type: string; visibility_scope: string; author_actor_id: string;
      }>(
        'SELECT id, revision_chain_id, job_id, task_id, issue_id, workstation_id, note_type, visibility_scope, author_actor_id FROM notes WHERE id = $1',
        [id],
      );
      if (!original) throw notFound();
      if (original.author_actor_id !== request.actor.actorId) throw forbidden();

      const newId = uuidv4() as NoteId;
      const now = new Date();

      await query(
        `INSERT INTO notes (id, revision_chain_id, supersedes_note_id, job_id, task_id, issue_id, workstation_id,
                            body, note_type, author_actor_id, author_type, review_state, visibility_scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          newId, original.revision_chain_id, original.id,
          original.job_id, original.task_id, original.issue_id, original.workstation_id,
          newBody, original.note_type, request.actor.actorId, request.actor.type,
          ReviewState.NotRequired, original.visibility_scope,
        ],
      );

      return reply.status(201).send({ id: newId, revisionChainId: original.revision_chain_id, supersedesNoteId: original.id });
    },
  );
}
