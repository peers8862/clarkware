export type { EventEnvelope } from './base-event.js';

export type {
  WorkstationSessionStartedEvent,
  WorkstationSessionEndedEvent,
} from './workstation-events.js';

export type {
  JobStartedEvent,
  JobPausedEvent,
  JobCompletedEvent,
} from './job-events.js';

export type {
  TaskCompletedEvent,
  TaskSkippedEvent,
} from './task-events.js';

export type {
  NoteCreatedEvent,
  NoteRevisedEvent,
} from './note-events.js';

export type { ArtifactAttachedEvent } from './artifact-events.js';
export type { MessageSentEvent } from './message-events.js';

export type {
  IssueOpenedEvent,
  IssueResolvedEvent,
} from './issue-events.js';

export type {
  AISummaryGeneratedEvent,
  AIRecommendationAcceptedEvent,
  AIRecommendationRejectedEvent,
} from './ai-events.js';

import type { WorkstationSessionStartedEvent, WorkstationSessionEndedEvent } from './workstation-events.js';
import type { JobStartedEvent, JobPausedEvent, JobCompletedEvent } from './job-events.js';
import type { TaskCompletedEvent, TaskSkippedEvent } from './task-events.js';
import type { NoteCreatedEvent, NoteRevisedEvent } from './note-events.js';
import type { ArtifactAttachedEvent } from './artifact-events.js';
import type { MessageSentEvent } from './message-events.js';
import type { IssueOpenedEvent, IssueResolvedEvent } from './issue-events.js';
import type { AISummaryGeneratedEvent, AIRecommendationAcceptedEvent, AIRecommendationRejectedEvent } from './ai-events.js';

export type DomainEvent =
  | WorkstationSessionStartedEvent
  | WorkstationSessionEndedEvent
  | JobStartedEvent
  | JobPausedEvent
  | JobCompletedEvent
  | TaskCompletedEvent
  | TaskSkippedEvent
  | NoteCreatedEvent
  | NoteRevisedEvent
  | ArtifactAttachedEvent
  | MessageSentEvent
  | IssueOpenedEvent
  | IssueResolvedEvent
  | AISummaryGeneratedEvent
  | AIRecommendationAcceptedEvent
  | AIRecommendationRejectedEvent;

export type DomainEventType = DomainEvent['type'];
