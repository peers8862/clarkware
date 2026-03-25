import type { EventEnvelope } from './base-event.js';
import type { IssueId, JobId, ActorId } from '../common/branded.js';
import type { IssueSeverity, IssueType } from '../objects/issue.js';

export type IssueOpenedEvent = EventEnvelope<
  'issue.opened',
  { readonly issueId: IssueId; readonly jobId: JobId | null; readonly issueType: IssueType; readonly description: string; readonly severity: IssueSeverity }
>;

export type IssueEscalatedEvent = EventEnvelope<
  'issue.escalated',
  { readonly issueId: IssueId; readonly escalatedToActorId: ActorId; readonly reason: string | null }
>;

export type IssueResolvedEvent = EventEnvelope<
  'issue.resolved',
  { readonly issueId: IssueId; readonly resolution: string }
>;
