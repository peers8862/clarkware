// Common
export type { Branded, FacilityId, ZoneId, WorkstationId, JobId, TaskId, IssueId,
  ConversationId, MessageId, NoteId, ToolId, MachineSessionId, ArtifactId,
  PersonId, AgentId, EventId } from './common/branded.js';
export { asId } from './common/branded.js';
export type { Timestamped, SoftDeletable } from './common/timestamps.js';

// Objects
export type { Facility, FacilityCreateInput, FacilityUpdateInput } from './objects/facility.js';
export type { Zone, ZoneCreateInput, ZoneUpdateInput } from './objects/zone.js';
export type { Workstation, WorkstationCreateInput, WorkstationUpdateInput, WorkstationType } from './objects/workstation.js';
export type { Job, JobCreateInput, JobUpdateInput, JobStatus } from './objects/job.js';
export type { Task, TaskCreateInput, TaskUpdateInput, TaskStatus } from './objects/task.js';
export type { Issue, IssueCreateInput, IssueUpdateInput, IssueSeverity, IssueStatus } from './objects/issue.js';
export type { Conversation, ConversationCreateInput, ConversationType } from './objects/conversation.js';
export type { Message, MessageCreateInput } from './objects/message.js';
export type { Note, NoteCreateInput, NoteReviseInput } from './objects/note.js';
export type { Tool, ToolCreateInput, ToolUpdateInput, ToolConnectionStatus } from './objects/tool.js';
export type { MachineSession, MachineSessionCreateInput } from './objects/machine-session.js';
export type { Artifact, ArtifactCreateInput } from './objects/artifact.js';
export type { Person, PersonCreateInput, PersonUpdateInput } from './objects/person.js';
export type { Agent, AgentCreateInput, AgentUpdateInput, AgentStatus } from './objects/agent.js';

// Identity
export { Role, ActorType } from './identity/roles.js';
export { PermissionCategory } from './identity/permissions.js';
export type { PermissionScope, PermissionGrant } from './identity/permissions.js';
export type { Actor, HumanActor, AgentActor } from './identity/actor.js';

// Events
export type {
  EventEnvelope,
  DomainEvent,
  DomainEventType,
  WorkstationSessionStartedEvent,
  WorkstationSessionEndedEvent,
  JobStartedEvent,
  JobPausedEvent,
  JobCompletedEvent,
  TaskCompletedEvent,
  TaskSkippedEvent,
  NoteCreatedEvent,
  NoteRevisedEvent,
  ArtifactAttachedEvent,
  MessageSentEvent,
  IssueOpenedEvent,
  IssueResolvedEvent,
  AISummaryGeneratedEvent,
  AIRecommendationAcceptedEvent,
  AIRecommendationRejectedEvent,
} from './events/index.js';
