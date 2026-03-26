/**
 * FirmwareService — domain service for the Firmware bounded context.
 *
 * Data ownership:
 *   OWNS: firmware_records
 *   READS (no write): jobs (for context/permission checks only)
 *
 * Communication:
 *   - State changes produce domain events via EventStore.appendWithClient()
 *   - FirmwareProvisioned CFX message written to cfx_outbox in the same
 *     transaction as recordFlashResult() — outbox pattern per ADR-001/ADR-007
 *   - No direct calls to other bounded context services
 *
 * Route handlers call this service; they do no SQL or business logic themselves.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, withTransaction } from '@clark/db';
import { EventStore } from '@clark/events';
import { SourceType, asId } from '@clark/core';
import type { EventId, JobId, FacilityId, WorkstationId } from '@clark/core';
import { writeToOutbox, CFX_MESSAGES } from '@clark/cfx';
import type { Actor } from './types.js';

const eventStore = new EventStore();

// ── Types ─────────────────────────────────────────────────────────────────────

export type FlashStatus = 'pending' | 'flashing' | 'success' | 'failed';

export interface FirmwareRecord {
  id: string;
  jobId: string;
  elfFilename: string;
  binaryHash: string;
  firmwareVersion: string | null;
  targetMcu: string;
  programmerSerial: string | null;
  flashStatus: FlashStatus;
  crcVerified: boolean | null;
  flashDurationMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateFirmwareRecordInput {
  jobId: string;
  facilityId: string;
  workstationId: string;
  elfFilename: string;
  binaryHash: string;
  firmwareVersion: string | null;
  targetMcu: string;
  programmerSerial: string | null;
}

export interface RecordFlashResultInput {
  recordId: string;
  jobId: string;
  facilityId: string;
  workstationId: string;
  flashStatus: 'success' | 'failed';
  crcVerified: boolean;
  flashDurationMs: number;
  errorMessage?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class FirmwareService {
  private readonly cfxHandle: string;

  constructor(cfxHandle = process.env.CLARK_CFX_HANDLE ?? 'clark.ipe.dev') {
    this.cfxHandle = cfxHandle;
  }

  /**
   * Create a pending firmware record before flashing begins.
   * The binary hash is recorded here — before the flash — so the provenance
   * chain is established even if the flash subsequently fails.
   */
  async createRecord(actor: Actor, input: CreateFirmwareRecordInput): Promise<FirmwareRecord> {
    const id = uuidv4();
    const now = new Date();

    await query(
      `INSERT INTO firmware_records
         (id, job_id, elf_filename, binary_hash, firmware_version,
          target_mcu, programmer_serial, flash_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [id, input.jobId, input.elfFilename, input.binaryHash,
       input.firmwareVersion ?? null, input.targetMcu,
       input.programmerSerial ?? null, now],
    );

    return {
      id, jobId: input.jobId, elfFilename: input.elfFilename,
      binaryHash: input.binaryHash, firmwareVersion: input.firmwareVersion ?? null,
      targetMcu: input.targetMcu, programmerSerial: input.programmerSerial ?? null,
      flashStatus: 'pending', crcVerified: null, flashDurationMs: null,
      errorMessage: null, createdAt: now, completedAt: null,
    };
  }

  /**
   * Record the result of a flash operation.
   *
   * On success: appends a domain event and writes a FirmwareProvisioned CFX
   * message to cfx_outbox — all in the same transaction as the DB update.
   * On failure: updates the record status to 'failed' with the error message.
   */
  async recordFlashResult(actor: Actor, input: RecordFlashResultInput): Promise<FirmwareRecord> {
    const existing = await queryOne<{ id: string; job_id: string; flash_status: string; binary_hash: string; target_mcu: string; programmer_serial: string | null }>(
      'SELECT id, job_id, flash_status, binary_hash, target_mcu, programmer_serial FROM firmware_records WHERE id = $1 AND job_id = $2',
      [input.recordId, input.jobId],
    );
    if (!existing) throw Object.assign(new Error('Firmware record not found'), { statusCode: 404 });
    if (existing.flash_status === 'success') throw Object.assign(new Error('Flash result already recorded'), { statusCode: 400 });

    const now = new Date();

    await withTransaction(async (client) => {
      // 1. Update the firmware record — owned by this context
      await client.query(
        `UPDATE firmware_records
         SET flash_status = $1, crc_verified = $2, flash_duration_ms = $3,
             error_message = $4, completed_at = $5
         WHERE id = $6`,
        [input.flashStatus, input.crcVerified, input.flashDurationMs,
         input.errorMessage ?? null, now, input.recordId],
      );

      // 2. Append domain event — same transaction
      const version = await this.currentEventVersion(input.jobId);
      const event = {
        id: asId<EventId>(uuidv4()),
        type: 'firmware.flash.recorded' as const,
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
        artifactRefs: [] as never,
        retentionClass: 'operational' as const,
        metadata: {} as Record<string, unknown>,
        payload: {
          recordId: input.recordId,
          jobId: input.jobId,
          flashStatus: input.flashStatus,
          crcVerified: input.crcVerified,
          binaryHash: existing.binary_hash,
          targetMcu: existing.target_mcu,
        } as never,
      };
      await eventStore.appendWithClient(client, `job:${input.jobId}`, version, [event]);

      // 3. CFX FirmwareProvisioned — only on success, per ADR-001 outbox pattern
      if (input.flashStatus === 'success') {
        await writeToOutbox(client, this.cfxHandle, CFX_MESSAGES.FIRMWARE_PROVISIONED, {
          WorkOrderIdentifier: input.jobId,
          WorkstationIdentifier: input.workstationId,
          FirmwareBinaryHash: existing.binary_hash,
          TargetMCU: existing.target_mcu,
          ProgrammerSerial: existing.programmer_serial ?? 'unknown',
          CRCVerified: input.crcVerified,
          FlashDurationMs: input.flashDurationMs,
          OperatorIdentifier: actor.actorId,
        });
      }
    });

    return this.getRecord(input.recordId);
  }

  async getRecordsForJob(jobId: string): Promise<FirmwareRecord[]> {
    return query<FirmwareRecord>(
      `SELECT id, job_id AS "jobId", elf_filename AS "elfFilename",
              binary_hash AS "binaryHash", firmware_version AS "firmwareVersion",
              target_mcu AS "targetMcu", programmer_serial AS "programmerSerial",
              flash_status AS "flashStatus", crc_verified AS "crcVerified",
              flash_duration_ms AS "flashDurationMs", error_message AS "errorMessage",
              created_at AS "createdAt", completed_at AS "completedAt"
       FROM firmware_records WHERE job_id = $1 ORDER BY created_at`,
      [jobId],
    );
  }

  private async getRecord(id: string): Promise<FirmwareRecord> {
    const record = await queryOne<FirmwareRecord>(
      `SELECT id, job_id AS "jobId", elf_filename AS "elfFilename",
              binary_hash AS "binaryHash", firmware_version AS "firmwareVersion",
              target_mcu AS "targetMcu", programmer_serial AS "programmerSerial",
              flash_status AS "flashStatus", crc_verified AS "crcVerified",
              flash_duration_ms AS "flashDurationMs", error_message AS "errorMessage",
              created_at AS "createdAt", completed_at AS "completedAt"
       FROM firmware_records WHERE id = $1`,
      [id],
    );
    if (!record) throw Object.assign(new Error('Firmware record not found'), { statusCode: 404 });
    return record;
  }

  private async currentEventVersion(jobId: string): Promise<number> {
    const row = await queryOne<{ max_seq: string | null }>(
      'SELECT MAX(sequence_number) AS max_seq FROM events WHERE stream_id = $1',
      [`job:${jobId}`],
    );
    return row?.max_seq != null ? Number(row.max_seq) : -1;
  }
}
