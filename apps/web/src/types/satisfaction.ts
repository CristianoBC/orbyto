export type SatisfactionFollowUpStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export interface Satisfaction {
  id: string; serviceOrderId: string; requesterId: string; rating: number; comment?: string | null; lowRatingReason?: string | null;
  followUpStatus?: SatisfactionFollowUpStatus | null; followUpNotes?: string | null; followedUpAt?: string | null; createdAt: string; updatedAt: string;
  requester: { id: string; name: string; email: string };
  serviceOrder: { id: string; title: string; status: string; finishedAt?: string | null };
  followedUpBy?: { id: string; name: string } | null;
}
export interface SatisfactionSummary { averageRating: number; total: number; lowRatings: number; highSatisfactionPercentage: number; pendingFollowUps: number; }
export interface ServiceOrderSatisfactionResponse { satisfaction: Satisfaction | null; canEvaluate: boolean; }
