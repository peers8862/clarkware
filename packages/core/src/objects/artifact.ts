import type { ArtifactId, JobId, TaskId, IssueId, FacilityId, WorkstationId, EventId } from '../common/branded.js';
import type { Timestamped } from '../common/timestamps.js';
import type { ArtifactType, RetentionClass } from '../common/enums.js';

export interface Artifact extends Timestamped {
  readonly id: ArtifactId;
  readonly artifactType: ArtifactType;
  readonly facilityId: FacilityId | null;
  readonly workstationId: WorkstationId | null;
  readonly jobId: JobId | null;
  readonly taskId: TaskId | null;
  readonly issueId: IssueId | null;
  /** The event that produced this artifact — provenance chain */
  readonly sourceEventId: EventId | null;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  /** S3-compatible URI e.g. "s3://clark-artifacts/fac_niagara/..." */
  readonly storageUri: string;
  readonly checksum: string;
  readonly checksumAlgorithm: string;
  readonly createdByActorId: string;
  readonly retentionClass: RetentionClass;
  readonly metadata: Record<string, unknown>;
}

export type ArtifactCreateInput = Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>;
