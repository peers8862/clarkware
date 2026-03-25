import { ReviewState } from '@clark/core';
import { query } from '@clark/db';

export interface ReviewableRecord {
  id: string;
  recordType: 'note' | 'message';
  reviewState: ReviewState;
  reviewedBy?: string;
  reviewedAt?: Date;
}

/** Valid ReviewState transitions */
const VALID_TRANSITIONS: Partial<Record<ReviewState, ReviewState[]>> = {
  [ReviewState.PendingReview]: [ReviewState.Accepted, ReviewState.Rejected, ReviewState.Edited],
  [ReviewState.Accepted]: [ReviewState.Edited],
};

function isValidTransition(from: ReviewState, to: ReviewState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function updateReviewState(
  record: ReviewableRecord,
  newState: ReviewState,
  reviewerActorId: string,
): Promise<void> {
  if (!isValidTransition(record.reviewState, newState)) {
    throw new Error(
      `Invalid review state transition: ${record.reviewState} → ${newState} for ${record.recordType} ${record.id}`,
    );
  }

  const reviewedAt = new Date();
  const table = record.recordType === 'note' ? 'notes' : 'messages';

  await query(
    `UPDATE ${table}
     SET review_state = $1,
         reviewed_by  = $2,
         reviewed_at  = $3
     WHERE id = $4`,
    [newState, reviewerActorId, reviewedAt, record.id],
  );
}
