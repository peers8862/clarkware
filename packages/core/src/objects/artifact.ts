import type { ArtifactId, JobId, TaskId, PersonId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';

export interface Artifact extends Timestamped {
  readonly id: ArtifactId;
  readonly jobId: JobId;
  readonly taskId: TaskId | null;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly storageKey: string;
  readonly uploadedBy: PersonId;
  readonly metadata: Record<string, unknown>;
}

export type ArtifactCreateInput = Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>;
