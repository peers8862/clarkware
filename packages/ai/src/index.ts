// Domain functions — these are the public API of @clark/ai
export { summarizeJob, summarizeIssue } from './summarizer.js';
export type { JobContext, JobSummary, IssueContext, IssueSummary } from './summarizer.js';

export { draftNote } from './note-drafter.js';
export type { NoteDraftContext, NoteDraft } from './note-drafter.js';

export { routeAlert } from './alert-router.js';
export type { AlertInput, AlertRouting } from './alert-router.js';

// Review state validation — returns an update for the caller to persist
export { buildReviewStateUpdate } from './review-manager.js';
export type { ReviewableRecord, ReviewStateUpdate } from './review-manager.js';
