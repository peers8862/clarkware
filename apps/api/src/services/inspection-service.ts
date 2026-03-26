/**
 * InspectionService — domain service for the Inspection bounded context.
 *
 * Data ownership:
 *   OWNS: inspection_steps, inspection_results, defect_records
 *   READS (no write): jobs (for context/permission checks only)
 *
 * Communication:
 *   - State changes produce domain events via EventStore.appendWithClient()
 *   - CFX messages for inspection events written to cfx_outbox in the same transaction
 *   - No direct calls to other bounded context services
 *
 * Route handlers call this service; they do no SQL or business logic themselves.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, withTransaction } from '@clark/db';
import { EventStore } from '@clark/events';
import { SourceType, asId } from '@clark/core';
import type { EventId, JobId, FacilityId, WorkstationId, ArtifactId } from '@clark/core';
import { writeToOutbox, CFX_MESSAGES } from '@clark/cfx';
import {
  getCriteria,
  getCriterionById,
  type AssemblyClass,
  type InspectionResult,
  type DefectDisposition,
  type InspectionStep,
  type InspectionPointResult,
  type DefectRecord,
} from '@clark/ipc-criteria';
import type { Actor } from './types.js';

export type { AssemblyClass, InspectionResult, DefectDisposition };

const eventStore = new EventStore();

export interface CreateInspectionStepInput {
  jobId: string;
  facilityId: string;
  workstationId: string;
  stepIndex: number;
  stepType: string;
  assemblyClass: AssemblyClass;
}

export interface LogInspectionPointInput {
  stepId: string;
  jobId: string;
  facilityId: string;
  workstationId: string;
  criterionId: string;
  result: InspectionResult;
  notes?: string;
  evidenceArtifactId?: string;
}

export interface DispositionDefectInput {
  defectId: string;
  jobId: string;
  facilityId: string;
  disposition: DefectDisposition;
  note?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class InspectionService {
  private readonly cfxHandle: string;

  constructor(cfxHandle = process.env.CLARK_CFX_HANDLE ?? 'clark.ipe.dev') {
    this.cfxHandle = cfxHandle;
  }

  // ── Criteria (read-only, no DB) ─────────────────────────────────────────────

  getCriteriaForStep(assemblyClass: AssemblyClass, stepType?: string) {
    return getCriteria(assemblyClass, stepType);
  }

  getCriterion(criterionId: string) {
    return getCriterionById(criterionId);
  }

  // ── Inspection steps ────────────────────────────────────────────────────────

  async createStep(actor: Actor, input: CreateInspectionStepInput): Promise<InspectionStep> {
    const id = uuidv4();
    const now = new Date();

    await query(
      `INSERT INTO inspection_steps
         (id, job_id, step_index, step_type, assembly_class, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [id, input.jobId, input.stepIndex, input.stepType, input.assemblyClass, now],
    );

    return {
      id, jobId: input.jobId, stepIndex: input.stepIndex,
      stepType: input.stepType, assemblyClass: input.assemblyClass,
      status: 'pending', createdAt: now, completedAt: null,
    };
  }

  async getStepsForJob(jobId: string): Promise<InspectionStep[]> {
    return query<InspectionStep>(
      `SELECT id, job_id AS "jobId", step_index AS "stepIndex",
              step_type AS "stepType", assembly_class AS "assemblyClass",
              status, created_at AS "createdAt", completed_at AS "completedAt"
       FROM inspection_steps WHERE job_id = $1 ORDER BY step_index`,
      [jobId],
    );
  }

  // ── Inspection point results ─────────────────────────────────────────────────

  /**
   * Record an operator's result for a single inspection criterion.
   *
   * If the result is Fail, a DefectRecord is created in the same transaction.
   * A domain event is appended and a CFX InspectionCompleted message is written
   * to the cfx_outbox — all in the same transaction as the inspection_results row.
   */
  async logInspectionPoint(
    actor: Actor,
    input: LogInspectionPointInput,
  ): Promise<{ result: InspectionPointResult; defect: DefectRecord | null }> {
    const criterion = getCriterionById(input.criterionId);
    if (!criterion) throw Object.assign(new Error(`Unknown criterion: ${input.criterionId}`), { statusCode: 400 });

    const resultId = uuidv4();
    const now = new Date();
    let defect: DefectRecord | null = null;

    await withTransaction(async (client) => {
      // 1. Write the inspection result — owned by this context
      await client.query(
        `INSERT INTO inspection_results
           (id, step_id, job_id, criterion_id, result, notes,
            evidence_artifact_id, operator_id, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [resultId, input.stepId, input.jobId, input.criterionId,
         input.result, input.notes ?? null, input.evidenceArtifactId ?? null,
         actor.actorId, now],
      );

      // 2. If the result is a Fail, create a DefectRecord — owned by this context
      if (input.result === 'Fail') {
        const defectId = uuidv4();
        await client.query(
          `INSERT INTO defect_records
             (id, step_id, job_id, criterion_id, description, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
          [defectId, input.stepId, input.jobId, input.criterionId,
           `${criterion.name} — ${criterion.reject['2']}`, now],
        );
        defect = {
          id: defectId, stepId: input.stepId, jobId: input.jobId,
          criterionId: input.criterionId,
          description: `${criterion.name}`,
          disposition: null, dispositionNote: null,
          dispositionBy: null, dispositionAt: null,
          status: 'open', createdAt: now,
        };
      }

      // 3. Append domain event — same transaction
      const version = await this.currentEventVersion(input.jobId);
      const event = {
        id: asId<EventId>(uuidv4()),
        type: 'inspection.point.logged' as const,
        facilityId: asId<FacilityId>(input.facilityId),
        workstationId: asId<WorkstationId>(input.workstationId),
        jobId: asId<JobId>(input.jobId),
        issueId: null,
        conversationId: null,
        streamId: `job:${input.jobId}`,
        sequenceNumber: version + 1,
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
          jobId: input.jobId,
          stepId: input.stepId,
          criterionId: input.criterionId,
          result: input.result,
          hasDefect: defect !== null,
        } as never,
      };
      await eventStore.appendWithClient(client, `job:${input.jobId}`, version, [event]);

      // 4. Write CFX message to outbox — same transaction
      // InspectionCompleted is published once the whole step is done (handled in completeStep),
      // but we write a NonConformanceCreated for each defect immediately.
      if (defect) {
        await writeToOutbox(client, this.cfxHandle, CFX_MESSAGES.NON_CONFORMANCE_CREATED, {
          NonConformanceIdentifier: defect.id,
          WorkOrderIdentifier: input.jobId,
          WorkstationIdentifier: input.workstationId,
          DefectCode: input.criterionId,
          DefectDescription: defect.description,
          OperatorIdentifier: actor.actorId,
        });
      }
    });

    return {
      result: {
        id: resultId,
        stepId: input.stepId,
        jobId: input.jobId,
        criterionId: input.criterionId,
        result: input.result,
        notes: input.notes ?? null,
        evidenceArtifactId: input.evidenceArtifactId ?? null,
        operatorId: actor.actorId,
        recordedAt: now,
      },
      defect,
    };
  }

  async getResultsForStep(stepId: string): Promise<InspectionPointResult[]> {
    return query<InspectionPointResult>(
      `SELECT id, step_id AS "stepId", job_id AS "jobId",
              criterion_id AS "criterionId", result, notes,
              evidence_artifact_id AS "evidenceArtifactId",
              operator_id AS "operatorId", recorded_at AS "recordedAt"
       FROM inspection_results WHERE step_id = $1 ORDER BY recorded_at`,
      [stepId],
    );
  }

  // ── Complete a step — publishes InspectionCompleted CFX message ──────────────

  async completeStep(
    actor: Actor,
    stepId: string,
    jobId: string,
    facilityId: string,
    workstationId: string,
  ): Promise<InspectionStep> {
    const step = await queryOne<{ id: string; status: string; assembly_class: string; step_type: string }>(
      'SELECT id, status, assembly_class, step_type FROM inspection_steps WHERE id = $1 AND job_id = $2',
      [stepId, jobId],
    );
    if (!step) throw Object.assign(new Error('Inspection step not found'), { statusCode: 404 });
    if (step.status === 'complete') throw Object.assign(new Error('Step already complete'), { statusCode: 400 });

    const now = new Date();

    // Count fails to determine step overall pass/fail
    const [{ fail_count }] = await query<{ fail_count: string }>(
      `SELECT COUNT(*) AS fail_count FROM inspection_results
       WHERE step_id = $1 AND result = 'Fail'`,
      [stepId],
    );

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE inspection_steps SET status = 'complete', completed_at = $1 WHERE id = $2`,
        [now, stepId],
      );

      const version = await this.currentEventVersion(jobId);
      const event = {
        id: asId<EventId>(uuidv4()),
        type: 'inspection.step.completed' as const,
        facilityId: asId<FacilityId>(facilityId),
        workstationId: asId<WorkstationId>(workstationId),
        jobId: asId<JobId>(jobId),
        issueId: null,
        conversationId: null,
        streamId: `job:${jobId}`,
        sequenceNumber: version + 1,
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
          jobId, stepId,
          overallResult: Number(fail_count) === 0 ? 'Pass' : 'Fail',
        } as never,
      };
      await eventStore.appendWithClient(client, `job:${jobId}`, version, [event]);

      // CFX InspectionCompleted — published once the whole step is complete
      await writeToOutbox(client, this.cfxHandle, CFX_MESSAGES.INSPECTION_COMPLETED, {
        WorkOrderIdentifier: jobId,
        WorkstationIdentifier: workstationId,
        InspectionResult: Number(fail_count) === 0 ? 'Pass' : 'Fail',
        InspectionDefectCount: Number(fail_count),
        OperatorIdentifier: actor.actorId,
        InspectionStepIdentifier: stepId,
      });
    });

    return {
      id: stepId, jobId, stepIndex: 0,
      stepType: step.step_type, assemblyClass: step.assembly_class as AssemblyClass,
      status: 'complete', createdAt: new Date(), completedAt: now,
    };
  }

  // ── Defect disposition ────────────────────────────────────────────────────────

  async dispositionDefect(actor: Actor, input: DispositionDefectInput): Promise<DefectRecord> {
    const now = new Date();
    await query(
      `UPDATE defect_records
       SET disposition = $1, disposition_note = $2, disposition_by = $3,
           disposition_at = $4, status = 'dispositioned'
       WHERE id = $5 AND job_id = $6`,
      [input.disposition, input.note ?? null, actor.actorId, now, input.defectId, input.jobId],
    );

    const defect = await queryOne<DefectRecord>(
      `SELECT id, step_id AS "stepId", job_id AS "jobId", criterion_id AS "criterionId",
              description, disposition, disposition_note AS "dispositionNote",
              disposition_by AS "dispositionBy", disposition_at AS "dispositionAt",
              status, created_at AS "createdAt"
       FROM defect_records WHERE id = $1`,
      [input.defectId],
    );
    if (!defect) throw Object.assign(new Error('Defect not found'), { statusCode: 404 });
    return defect;
  }

  async getDefectsForJob(jobId: string): Promise<DefectRecord[]> {
    return query<DefectRecord>(
      `SELECT id, step_id AS "stepId", job_id AS "jobId", criterion_id AS "criterionId",
              description, disposition, disposition_note AS "dispositionNote",
              disposition_by AS "dispositionBy", disposition_at AS "dispositionAt",
              status, created_at AS "createdAt"
       FROM defect_records WHERE job_id = $1 ORDER BY created_at`,
      [jobId],
    );
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async currentEventVersion(jobId: string): Promise<number> {
    const row = await queryOne<{ max_seq: string | null }>(
      'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
      [`job:${jobId}`],
    );
    return row?.max_seq != null ? Number(row.max_seq) : -1;
  }
}
