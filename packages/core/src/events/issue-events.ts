import type { EventEnvelope } from './base-event.js';
import type { IssueId, JobId } from '../common/branded.js';
import type { IssueSeverity } from '../objects/issue.js';

export type IssueOpenedEvent = EventEnvelope<
  'issue.opened',
  {
    readonly issueId: IssueId;
    readonly jobId: JobId;
    readonly description: string;
    readonly severity: IssueSeverity;
  }
>;

export type IssueResolvedEvent = EventEnvelope<
  'issue.resolved',
  {
    readonly issueId: IssueId;
    readonly resolution: string;
  }
>;
