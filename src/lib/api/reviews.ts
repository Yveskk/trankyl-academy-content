import { api } from "./client";
import type { Review, ReviewSummary } from "./types";

export function getPrestataireReviews(prestataireId: number) {
  return api.get<ReviewSummary>(`/reviews/prestataire/${prestataireId}`);
}

export function createReview(payload: { prestataire_id: number; rating: number; comment?: string }) {
  return api.post<Review>("/reviews", payload);
}
