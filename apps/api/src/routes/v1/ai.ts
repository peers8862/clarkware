import type { FastifyInstance } from 'fastify';
import { ReviewState, NoteType } from '@clark/core';
import {
  summarizeJob,
  summarizeIssue,
  draftNote,
  routeAlert,
  updateReviewState,
} from '@clark/ai';
import type { JobContext, IssueContext, NoteDraftContext, AlertInput, ReviewableRecord } from '@clark/ai';
import { badRequest } from '../../errors.js';

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /v1/ai/summarize-job
   * Body: JobContext
   */
  fastify.post<{ Body: JobContext }>('/ai/summarize-job', async (request) => {
    const ctx = request.body;
    if (!ctx.jobId) throw badRequest('jobId is required');
    return summarizeJob(ctx);
  });

  /**
   * POST /v1/ai/summarize-issue
   * Body: IssueContext
   */
  fastify.post<{ Body: IssueContext }>('/ai/summarize-issue', async (request) => {
    const ctx = request.body;
    if (!ctx.issueId) throw badRequest('issueId is required');
    return summarizeIssue(ctx);
  });

  /**
   * POST /v1/ai/draft-note
   * Body: NoteDraftContext
   */
  fastify.post<{ Body: NoteDraftContext }>('/ai/draft-note', async (request) => {
    const ctx = request.body;
    if (!ctx.noteType) throw badRequest('noteType is required');
    if (!Object.values(NoteType).includes(ctx.noteType)) {
      throw badRequest(`Invalid noteType: ${ctx.noteType}`);
    }
    return draftNote(ctx);
  });

  /**
   * POST /v1/ai/route-alert
   * Body: AlertInput
   */
  fastify.post<{ Body: AlertInput }>('/ai/route-alert', async (request) => {
    const alert = request.body;
    if (!alert.message) throw badRequest('message is required');
    if (!alert.facilityId) throw badRequest('facilityId is required');
    if (!alert.severity) throw badRequest('severity is required');
    return routeAlert(alert);
  });

  /**
   * POST /v1/ai/review
   * Body: { id: string; recordType: 'note' | 'message'; currentState: ReviewState; newState: ReviewState }
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

    const record: ReviewableRecord = {
      id,
      recordType,
      reviewState: currentState,
    };

    const reviewerActorId = request.actor.actorId;
    await updateReviewState(record, newState, reviewerActorId);
    return { ok: true };
  });
}
