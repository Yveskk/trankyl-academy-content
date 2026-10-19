import { api } from "./client";
import type { Review, ReviewSummary } from "./types";

export function getPrestataireReviews(prestataireId: number) {
  return api.get<ReviewSummary>(`/reviews/prestataire/${prestataireId}`);
}

export function createReview(payload: { prestataire_id: number; rating: number; comment?: string }) {
  return api.post<Review>("/reviews", payload);
}

// ---------------------------------------------------------------------------
// Administration : moderation des avis
// ---------------------------------------------------------------------------
export type AdminReview = {
  id: number;
  vendor_id: number;
  vendor_name: string | null;
  client_id: number;
  client_firstname: string | null;
  rating: number;
  comment: string | null;
  status: "approved" | "pending" | "rejected";
  source: "academy" | "booking_mark" | "admin";
  booking_id: number | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export const adminListReviews = (status?: string) => api.get<AdminReview[]>(`/reviews/admin${status ? `?status=${status}` : ""}`);
export const adminModerateReview = (id: number, body: { status?: AdminReview["status"]; reply?: string }) =>
  api.patch<AdminReview>(`/reviews/admin/${id}`, body);
export const adminImportBookingMarks = () =>
  api.post<{ scanned: number; imported: number; skipped_existing: number; skipped_invalid: number }>("/reviews/admin/import-booking-marks");
