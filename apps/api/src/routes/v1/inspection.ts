/**
 * Inspection routes — thin HTTP adapter.
 * No SQL, no business logic, no external integration calls here.
 * All domain logic lives in InspectionService.
 */
import type { FastifyInstance } from 'fastify';
import { InspectionService } from '../../services/inspection-service.js';

const inspectionService = new InspectionService();

export default async function inspectionRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Criteria (read-only, no DB) ───────────────────────────────────────────

  fastify.get<{
    Querystring: { assemblyClass?: string; stepType?: string };
  }>('/inspection/criteria', async (request) => {
    const { assemblyClass, stepType } = request.query;
    return inspectionService.getCriteriaForStep(
      (assemblyClass ?? '2') as import('@clark/ipc-criteria').AssemblyClass,
      stepType,
    );
  });

  fastify.get<{ Params: { id: string } }>('/inspection/criteria/:id', async (request, reply) => {
    const criterion = inspectionService.getCriterion(request.params.id);
    if (!criterion) return reply.status(404).send({ message: 'Criterion not found' });
    return criterion;
  });

  // ── Inspection steps ──────────────────────────────────────────────────────

  fastify.post<{
    Body: {
      jobId: string;
      facilityId: string;
      workstationId: string;
      stepIndex: number;
      stepType: string;
      assemblyClass: string;
    };
  }>(
    '/inspection/steps',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'facilityId', 'workstationId', 'stepIndex', 'stepType', 'assemblyClass'],
          properties: {
            jobId:         { type: 'string', minLength: 1 },
            facilityId:    { type: 'string', minLength: 1 },
            workstationId: { type: 'string', minLength: 1 },
            stepIndex:     { type: 'integer', minimum: 0 },
            stepType:      { type: 'string', minLength: 1 },
            assemblyClass: { type: 'string', enum: ['1', '2', '3'] },
          },
        },
      },
    },
    async (request, reply) => {
      const step = await inspectionService.createStep(request.actor, {
        jobId: request.body.jobId,
        facilityId: request.body.facilityId,
        workstationId: request.body.workstationId,
        stepIndex: request.body.stepIndex,
        stepType: request.body.stepType,
        assemblyClass: request.body.assemblyClass as import('@clark/ipc-criteria').AssemblyClass,
      });
      return reply.status(201).send(step);
    },
  );

  fastify.get<{ Params: { jobId: string } }>('/inspection/steps/job/:jobId', async (request) => {
    return inspectionService.getStepsForJob(request.params.jobId);
  });

  fastify.post<{ Params: { stepId: string }; Body: { jobId: string; facilityId: string; workstationId: string } }>(
    '/inspection/steps/:stepId/complete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'facilityId', 'workstationId'],
          properties: {
            jobId:         { type: 'string', minLength: 1 },
            facilityId:    { type: 'string', minLength: 1 },
            workstationId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      return inspectionService.completeStep(
        request.actor,
        request.params.stepId,
        request.body.jobId,
        request.body.facilityId,
        request.body.workstationId,
      );
    },
  );

  // ── Inspection point results ──────────────────────────────────────────────

  fastify.post<{
    Body: {
      stepId: string;
      jobId: string;
      facilityId: string;
      workstationId: string;
      criterionId: string;
      result: string;
      notes?: string;
      evidenceArtifactId?: string;
    };
  }>(
    '/inspection/results',
    {
      schema: {
        body: {
          type: 'object',
          required: ['stepId', 'jobId', 'facilityId', 'workstationId', 'criterionId', 'result'],
          properties: {
            stepId:              { type: 'string', minLength: 1 },
            jobId:               { type: 'string', minLength: 1 },
            facilityId:          { type: 'string', minLength: 1 },
            workstationId:       { type: 'string', minLength: 1 },
            criterionId:         { type: 'string', minLength: 1 },
            result:              { type: 'string', enum: ['Pass', 'Fail', 'ProcessIndicator', 'NotEvaluated'] },
            notes:               { type: 'string' },
            evidenceArtifactId:  { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const outcome = await inspectionService.logInspectionPoint(request.actor, {
        stepId: request.body.stepId,
        jobId: request.body.jobId,
        facilityId: request.body.facilityId,
        workstationId: request.body.workstationId,
        criterionId: request.body.criterionId,
        result: request.body.result as import('@clark/ipc-criteria').InspectionResult,
        notes: request.body.notes,
        evidenceArtifactId: request.body.evidenceArtifactId,
      });
      return reply.status(201).send(outcome);
    },
  );

  fastify.get<{ Params: { stepId: string } }>('/inspection/results/step/:stepId', async (request) => {
    return inspectionService.getResultsForStep(request.params.stepId);
  });

  // ── Defects ───────────────────────────────────────────────────────────────

  fastify.get<{ Params: { jobId: string } }>('/inspection/defects/job/:jobId', async (request) => {
    return inspectionService.getDefectsForJob(request.params.jobId);
  });

  fastify.post<{
    Params: { defectId: string };
    Body: { jobId: string; disposition: string; note?: string };
  }>(
    '/inspection/defects/:defectId/disposition',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'disposition'],
          properties: {
            jobId:       { type: 'string', minLength: 1 },
            disposition: { type: 'string', enum: ['Repair', 'Reject', 'UseAsIs', 'CustomerWaiver'] },
            note:        { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      return inspectionService.dispositionDefect(request.actor, {
        defectId: request.params.defectId,
        jobId: request.body.jobId,
        disposition: request.body.disposition as import('@clark/ipc-criteria').DefectDisposition,
        note: request.body.note,
      });
    },
  );
}
