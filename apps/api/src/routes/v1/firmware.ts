/**
 * Firmware routes — thin HTTP adapter.
 * No SQL, no business logic, no external integration calls here.
 * All domain logic lives in FirmwareService.
 */
import type { FastifyInstance } from 'fastify';
import { FirmwareService } from '../../services/firmware-service.js';

const firmwareService = new FirmwareService();

export default async function firmwareRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Create pending firmware record (pre-flash) ────────────────────────────

  fastify.post<{
    Body: {
      jobId: string;
      facilityId: string;
      workstationId: string;
      elfFilename: string;
      binaryHash: string;
      firmwareVersion?: string;
      targetMcu: string;
      programmerSerial?: string;
    };
  }>(
    '/firmware/records',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'facilityId', 'workstationId', 'elfFilename', 'binaryHash', 'targetMcu'],
          properties: {
            jobId:            { type: 'string', minLength: 1 },
            facilityId:       { type: 'string', minLength: 1 },
            workstationId:    { type: 'string', minLength: 1 },
            elfFilename:      { type: 'string', minLength: 1 },
            binaryHash:       { type: 'string', minLength: 64, maxLength: 64 },
            firmwareVersion:  { type: 'string' },
            targetMcu:        { type: 'string', minLength: 1 },
            programmerSerial: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const record = await firmwareService.createRecord(request.actor, {
        jobId:            request.body.jobId,
        facilityId:       request.body.facilityId,
        workstationId:    request.body.workstationId,
        elfFilename:      request.body.elfFilename,
        binaryHash:       request.body.binaryHash,
        firmwareVersion:  request.body.firmwareVersion ?? null,
        targetMcu:        request.body.targetMcu,
        programmerSerial: request.body.programmerSerial ?? null,
      });
      return reply.status(201).send(record);
    },
  );

  // ── Record flash result ───────────────────────────────────────────────────

  fastify.post<{
    Params: { recordId: string };
    Body: {
      jobId: string;
      facilityId: string;
      workstationId: string;
      flashStatus: 'success' | 'failed';
      crcVerified: boolean;
      flashDurationMs: number;
      errorMessage?: string;
    };
  }>(
    '/firmware/records/:recordId/result',
    {
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'facilityId', 'workstationId', 'flashStatus', 'crcVerified', 'flashDurationMs'],
          properties: {
            jobId:          { type: 'string', minLength: 1 },
            facilityId:     { type: 'string', minLength: 1 },
            workstationId:  { type: 'string', minLength: 1 },
            flashStatus:    { type: 'string', enum: ['success', 'failed'] },
            crcVerified:    { type: 'boolean' },
            flashDurationMs:{ type: 'integer', minimum: 0 },
            errorMessage:   { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      return firmwareService.recordFlashResult(request.actor, {
        recordId:       request.params.recordId,
        jobId:          request.body.jobId,
        facilityId:     request.body.facilityId,
        workstationId:  request.body.workstationId,
        flashStatus:    request.body.flashStatus,
        crcVerified:    request.body.crcVerified,
        flashDurationMs:request.body.flashDurationMs,
        errorMessage:   request.body.errorMessage,
      });
    },
  );

  // ── List records for a job ────────────────────────────────────────────────

  fastify.get<{ Params: { jobId: string } }>('/firmware/records/job/:jobId', async (request) => {
    return firmwareService.getRecordsForJob(request.params.jobId);
  });
}
