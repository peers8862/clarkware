export type { EventEnvelope } from './base-event.js';

export type { WorkstationSessionStartedEvent, WorkstationSessionEndedEvent } from './workstation-events.js';
export type { JobCreatedEvent, JobStartedEvent, JobPausedEvent, JobCompletedEvent, JobClosedEvent, JobOwnershipTransferredEvent } from './job-events.js';
export type { TaskAssignedEvent, TaskCompletedEvent, TaskSkippedEvent } from './task-events.js';
export type { NoteCreatedEvent, NoteRevisedEvent, NoteAIDraftAcceptedEvent } from './note-events.js';
export type { ArtifactAttachedEvent } from './artifact-events.js';
export type { ConversationCreatedEvent, MessageSentEvent, MessageReviewedEvent } from './message-events.js';
export type { IssueOpenedEvent, IssueEscalatedEvent, IssueResolvedEvent } from './issue-events.js';
export type { AISummaryGeneratedEvent, AIRecommendationAcceptedEvent, AIRecommendationRejectedEvent } from './ai-events.js';
export type { ToolAdapterConnectedEvent, TestRunImportedEvent, CalibrationResultImportedEvent } from './tool-events.js';
export type { PermissionGrantedEvent, PermissionRevokedEvent } from './permission-events.js';
export type { PresenceChangedEvent } from './presence-events.js';
export type { ShiftStartedEvent, ShiftHandedOffEvent } from './shift-events.js';

import type { WorkstationSessionStartedEvent, WorkstationSessionEndedEvent } from './workstation-events.js';
import type { JobCreatedEvent, JobStartedEvent, JobPausedEvent, JobCompletedEvent, JobClosedEvent, JobOwnershipTransferredEvent } from './job-events.js';
import type { TaskAssignedEvent, TaskCompletedEvent, TaskSkippedEvent } from './task-events.js';
import type { NoteCreatedEvent, NoteRevisedEvent, NoteAIDraftAcceptedEvent } from './note-events.js';
import type { ArtifactAttachedEvent } from './artifact-events.js';
import type { ConversationCreatedEvent, MessageSentEvent, MessageReviewedEvent } from './message-events.js';
import type { IssueOpenedEvent, IssueEscalatedEvent, IssueResolvedEvent } from './issue-events.js';
import type { AISummaryGeneratedEvent, AIRecommendationAcceptedEvent, AIRecommendationRejectedEvent } from './ai-events.js';
import type { ToolAdapterConnectedEvent, TestRunImportedEvent, CalibrationResultImportedEvent } from './tool-events.js';
import type { PermissionGrantedEvent, PermissionRevokedEvent } from './permission-events.js';
import type { PresenceChangedEvent } from './presence-events.js';
import type { ShiftStartedEvent, ShiftHandedOffEvent } from './shift-events.js';

export type DomainEvent =
  | WorkstationSessionStartedEvent
  | WorkstationSessionEndedEvent
  | JobCreatedEvent
  | JobStartedEvent
  | JobPausedEvent
  | JobCompletedEvent
  | JobClosedEvent
  | JobOwnershipTransferredEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | TaskSkippedEvent
  | NoteCreatedEvent
  | NoteRevisedEvent
  | NoteAIDraftAcceptedEvent
  | ArtifactAttachedEvent
  | ConversationCreatedEvent
  | MessageSentEvent
  | MessageReviewedEvent
  | IssueOpenedEvent
  | IssueEscalatedEvent
  | IssueResolvedEvent
  | AISummaryGeneratedEvent
  | AIRecommendationAcceptedEvent
  | AIRecommendationRejectedEvent
  | ToolAdapterConnectedEvent
  | TestRunImportedEvent
  | CalibrationResultImportedEvent
  | PermissionGrantedEvent
  | PermissionRevokedEvent
  | PresenceChangedEvent
  | ShiftStartedEvent
  | ShiftHandedOffEvent;

export type DomainEventType = DomainEvent['type'];
