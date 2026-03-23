import type { EventEnvelope } from './base-event.js';
import type { ArtifactId, JobId, TaskId } from '../common/branded.js';

export type ArtifactAttachedEvent = EventEnvelope<
  'artifact.attached',
  {
    readonly artifactId: ArtifactId;
    readonly jobId: JobId;
    readonly taskId: TaskId | null;
    readonly storageKey: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  }
>;
