import type { EventEnvelope } from './base-event.js';
import type { JobId, NoteId } from '../common/branded.js';

export type AISummaryGeneratedEvent = EventEnvelope<
  'ai.summary.generated',
  { readonly jobId: JobId; readonly summaryText: string; readonly modelId: string; readonly sourceContextIds: ReadonlyArray<string> }
>;

export type AIRecommendationAcceptedEvent = EventEnvelope<
  'ai.recommendation.accepted',
  { readonly recommendationId: string; readonly jobId: JobId | null; readonly acceptedByActorId: string }
>;

export type AIRecommendationRejectedEvent = EventEnvelope<
  'ai.recommendation.rejected',
  { readonly recommendationId: string; readonly jobId: JobId | null; readonly rejectedByActorId: string; readonly reason: string | null }
>;
