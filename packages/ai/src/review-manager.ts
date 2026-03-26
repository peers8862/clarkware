import { ReviewState } from '@clark/core';

export interface ReviewableRecord {
  id: string;
  recordType: 'note' | 'message';
  reviewState: ReviewState;
  reviewedBy?: string;
  reviewedAt?: Date;
}

/** The result of validating a review state transition. Callers persist this. */
export interface ReviewStateUpdate {
  recordId: string;
  recordType: 'note' | 'message';
  newState: ReviewState;
  reviewedBy: string;
  reviewedAt: Date;
}

/** Valid ReviewState transitions */
const VALID_TRANSITIONS: Partial<Record<ReviewState, ReviewState[]>> = {
  [ReviewState.PendingReview]: [ReviewState.Accepted, ReviewState.Rejected, ReviewState.Edited],
  [ReviewState.Accepted]: [ReviewState.Edited],
};

function isValidTransition(from: ReviewState, to: ReviewState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validates a review state transition and returns the update to apply.
 * The AI package does NOT persist anything — the calling service owns the record
 * and is responsible for writing the ReviewStateUpdate to the database.
 */
export function buildReviewStateUpdate(
  record: ReviewableRecord,
  newState: ReviewState,
  reviewerActorId: string,
): ReviewStateUpdate {
  if (!isValidTransition(record.reviewState, newState)) {
    throw new Error(
      `Invalid review state transition: ${record.reviewState} → ${newState} for ${record.recordType} ${record.id}`,
    );
  }

  return {
    recordId: record.id,
    recordType: record.recordType,
    newState,
    reviewedBy: reviewerActorId,
    reviewedAt: new Date(),
  };
}
