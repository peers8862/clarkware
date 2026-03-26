import type { FastifyInstance } from 'fastify';
import { ReviewState, NoteType } from '@clark/core';
import {
  summarizeJob,
  summarizeIssue,
  draftNote,
  routeAlert,
  buildReviewStateUpdate,
} from '@clark/ai';
import type { JobContext, IssueContext, NoteDraftContext, AlertInput, ReviewableRecord } from '@clark/ai';
import { query } from '@clark/db';
import { badRequest } from '../../errors.js';

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: JobContext }>('/ai/summarize-job', async (request) => {
    const ctx = request.body;
    if (!ctx.jobId) throw badRequest('jobId is required');
    return summarizeJob(ctx);
  });

  fastify.post<{ Body: IssueContext }>('/ai/summarize-issue', async (request) => {
    const ctx = request.body;
    if (!ctx.issueId) throw badRequest('issueId is required');
    return summarizeIssue(ctx);
  });

  fastify.post<{ Body: NoteDraftContext }>('/ai/draft-note', async (request) => {
    const ctx = request.body;
    if (!ctx.noteType) throw badRequest('noteType is required');
    if (!Object.values(NoteType).includes(ctx.noteType)) {
      throw badRequest(`Invalid noteType: ${ctx.noteType}`);
    }
    return draftNote(ctx);
  });

  fastify.post<{ Body: AlertInput }>('/ai/route-alert', async (request) => {
    const alert = request.body;
    if (!alert.message) throw badRequest('message is required');
    if (!alert.facilityId) throw badRequest('facilityId is required');
    if (!alert.severity) throw badRequest('severity is required');
    return routeAlert(alert);
  });

  /**
   * POST /v1/ai/review
   * Validates the review state transition and persists it.
   * The AI package is responsible only for the validation — this route owns the persistence
   * because the notes and messages tables belong to their respective contexts (Notes, Conversations).
   */
  fastify.post<{
    Body: {
      id: string;
      recordType: 'note' | 'message';
      currentState: ReviewState;
      newState: ReviewState;
    };
  }>('/ai/review', async (request) => {
    const { id, recordType, currentState, newState } = request.body;
    if (!id) throw badRequest('id is required');
    if (recordType !== 'note' && recordType !== 'message') {
      throw badRequest('recordType must be "note" or "message"');
    }
    if (!newState) throw badRequest('newState is required');

    const record: ReviewableRecord = { id, recordType, reviewState: currentState };
    const update = buildReviewStateUpdate(record, newState, request.actor.actorId);

    // This route owns the DB write — the AI package does not touch the database
    const table = update.recordType === 'note' ? 'notes' : 'messages';
    await query(
      `UPDATE ${table}
       SET review_state = $1, reviewed_by = $2, reviewed_at = $3
       WHERE id = $4`,
      [update.newState, update.reviewedBy, update.reviewedAt, update.recordId],
    );

    return { ok: true };
  });
}
