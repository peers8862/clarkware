import type { MachineSessionId, ToolId, JobId, WorkstationId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';

export interface MachineSession extends Timestamped {
  readonly id: MachineSessionId;
  readonly toolId: ToolId;
  readonly jobId: JobId | null;
  readonly workstationId: WorkstationId | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly durationSeconds: number | null;
  readonly metadata: Record<string, unknown>;
}

export type MachineSessionCreateInput = Omit<MachineSession, 'id' | 'endedAt' | 'durationSeconds' | 'createdAt' | 'updatedAt'>;
