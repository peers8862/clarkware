// Common
export type { Branded, ActorId, FacilityId, ZoneId, WorkstationId, JobId, TaskId, IssueId,
  ConversationId, MessageId, NoteId, ToolId, MachineSessionId, ArtifactId,
  PersonId, AgentId, AutomationServiceId, EventId, ShiftId, PermissionGrantId,
  RevisionChainId } from './common/branded.js';
export { asId } from './common/branded.js';
export type { Timestamped, SoftDeletable } from './common/timestamps.js';
export {
  SourceType, MessageClass, ReviewState, NoteType, ArtifactType, RetentionClass,
  IntegrationMode, AdapterStatus, PresenceStateValue, TaskType, AgentType,
  AgentActionClass, ZoneType, JobType, Priority, ConversationType,
  AutomationServiceType,
} from './common/enums.js';

// Objects
export type { Facility, FacilityCreateInput, FacilityUpdateInput, FacilityStatus } from './objects/facility.js';
export type { Zone, ZoneCreateInput, ZoneUpdateInput, ZoneStatus } from './objects/zone.js';
export type { Workstation, WorkstationCreateInput, WorkstationUpdateInput, WorkstationStatus } from './objects/workstation.js';
export type { Job, JobCreateInput, JobUpdateInput, JobStatus } from './objects/job.js';
export type { Task, TaskCreateInput, TaskUpdateInput, TaskStatus } from './objects/task.js';
export type { Issue, IssueCreateInput, IssueUpdateInput, IssueSeverity, IssueStatus, IssueType } from './objects/issue.js';
export type { Conversation, ConversationCreateInput, ConversationStatus } from './objects/conversation.js';
export type { Message, MessageCreateInput } from './objects/message.js';
export type { Note, NoteCreateInput, NoteReviseInput, NoteVisibilityScope } from './objects/note.js';
export type { Tool, ToolCreateInput, ToolUpdateInput } from './objects/tool.js';
export type { MachineSession, MachineSessionCreateInput } from './objects/machine-session.js';
export type { Artifact, ArtifactCreateInput } from './objects/artifact.js';
export type { Person, PersonCreateInput, PersonUpdateInput, EmploymentType, PersonStatus } from './objects/person.js';
export type { Agent, AgentCreateInput, AgentUpdateInput, AgentStatus } from './objects/agent.js';
export type { AutomationService, AutomationServiceCreateInput, AutomationServiceUpdateInput } from './objects/automation-service.js';
export type { Shift, ShiftCreateInput, ShiftStatus } from './objects/shift.js';
export type { PresenceState, PresenceStateUpsertInput } from './objects/presence-state.js';

// Identity
export { Role, ActorType } from './identity/roles.js';
export { PermissionCategory } from './identity/permissions.js';
export type { PermissionScope, PermissionGrant } from './identity/permissions.js';
export type { Actor, HumanActor, AIAgentActor, AutomationServiceActor } from './identity/actor.js';
export { isHuman, isAIAgent, isAutomation, actorRefId } from './identity/actor.js';

// Events
export type {
  EventEnvelope, DomainEvent, DomainEventType,
  WorkstationSessionStartedEvent, WorkstationSessionEndedEvent,
  JobCreatedEvent, JobStartedEvent, JobPausedEvent, JobCompletedEvent, JobClosedEvent, JobOwnershipTransferredEvent,
  TaskAssignedEvent, TaskCompletedEvent, TaskSkippedEvent,
  NoteCreatedEvent, NoteRevisedEvent, NoteAIDraftAcceptedEvent,
  ArtifactAttachedEvent,
  ConversationCreatedEvent, MessageSentEvent, MessageReviewedEvent,
  IssueOpenedEvent, IssueEscalatedEvent, IssueResolvedEvent,
  AISummaryGeneratedEvent, AIRecommendationAcceptedEvent, AIRecommendationRejectedEvent,
  ToolAdapterConnectedEvent, TestRunImportedEvent, CalibrationResultImportedEvent,
  PermissionGrantedEvent, PermissionRevokedEvent,
  PresenceChangedEvent,
  ShiftStartedEvent, ShiftHandedOffEvent,
} from './events/index.js';
