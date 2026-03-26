/**
 * Jobs routes — thin HTTP adapter.
 * No SQL, no business logic, no external integration calls here.
 * All domain logic lives in JobService.
 */
import type { FastifyInstance } from 'fastify';
import { JobService } from '../../services/job-service.js';
import { notFound, forbidden, badRequest } from '../../errors.js';
import { broadcastEvent } from '../ws/realtime.js';

const jobService = new JobService();

export default async function jobsRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.get('/jobs', async (request) => {
    return jobService.listJobs(request.actor);
  });

  fastify.get<{ Params: { id: string } }>('/jobs/:id', async (request) => {
    return jobService.getJob(request.actor, request.params.id);
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
      const result = await jobService.createJob(request.actor, request.body);
      return reply.status(201).send(result);
    },
  );

  fastify.post<{ Params: { id: string } }>('/jobs/:id/start', {}, async (request, reply) => {
    const result = await jobService.startJob(request.actor, request.params.id);
    return reply.status(200).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/jobs/:id/resume', {}, async (request, reply) => {
    const result = await jobService.resumeJob(request.actor, request.params.id);
    return reply.status(200).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/jobs/:id/reopen', {}, async (request, reply) => {
    const result = await jobService.reopenJob(request.actor, request.params.id);
    return reply.status(200).send(result);
  });

  fastify.patch<{
    Params: { id: string };
    Body: {
      status?: string;
      title?: string;
      description?: string;
      priority?: string;
    };
  }>(
    '/jobs/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          minProperties: 1,
          properties: {
            status:      { type: 'string', enum: ['paused', 'completed', 'voided'] },
            title:       { type: 'string', minLength: 1 },
            description: { type: 'string' },
            priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
        },
      },
    },
    async (request) => {
      return jobService.updateJob(request.actor, request.params.id, request.body as never);
    },
  );
}
