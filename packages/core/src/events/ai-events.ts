import type { EventEnvelope } from './base-event.js';
import type { JobId } from '../common/branded.js';

export type AISummaryGeneratedEvent = EventEnvelope<
  'ai.summary.generated',
  {
    readonly jobId: JobId;
    readonly summaryText: string;
    readonly modelId: string;
  }
>;

export type AIRecommendationAcceptedEvent = EventEnvelope<
  'ai.recommendation.accepted',
  {
    readonly recommendationId: string;
    readonly jobId: JobId;
    readonly actorId: string;
  }
>;

export type AIRecommendationRejectedEvent = EventEnvelope<
  'ai.recommendation.rejected',
  {
    readonly recommendationId: string;
    readonly jobId: JobId;
    readonly actorId: string;
    readonly reason: string | null;
  }
>;
