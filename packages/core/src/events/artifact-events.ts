import type { EventEnvelope } from './base-event.js';
import type { ArtifactId, JobId, TaskId, IssueId } from '../common/branded.js';
import type { ArtifactType } from '../common/enums.js';

export type ArtifactAttachedEvent = EventEnvelope<
  'artifact.attached',
  { readonly artifactId: ArtifactId; readonly artifactType: ArtifactType; readonly jobId: JobId | null; readonly taskId: TaskId | null; readonly issueId: IssueId | null; readonly storageUri: string; readonly checksum: string; readonly sizeBytes: number }
>;
