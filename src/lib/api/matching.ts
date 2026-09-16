import { api } from "./client";
import type {
  MatchingRequest,
  Match,
  Message,
  Conversation,
  Prestataire,
  ApprenantDetail,
} from "./types";

// --- Matching ---
export function searchPrestataires(metierCode?: string) {
  const query = metierCode ? `?metier_code=${metierCode}` : "";
  return api.get<Prestataire[]>(`/matching/prestataires${query}`);
}

export function createMatchingRequest(payload: { metier_code: string; description?: string }) {
  return api.post<MatchingRequest>("/matching/requests", payload);
}

export function myRequests() {
  return api.get<MatchingRequest[]>("/matching/requests");
}

export function getMatches(requestId: number) {
  return api.get<Match[]>(`/matching/requests/${requestId}/matches`);
}

// --- Messaging ---
export function sendMessage(payload: { receiver_id: number; match_id?: number; content: string }) {
  return api.post<Message>("/matching/messages", payload);
}

export function myConversations() {
  return api.get<Conversation[]>("/matching/messages/conversations");
}

export function getMessages(userId: number) {
  return api.get<Message[]>(`/matching/messages/${userId}`);
}

export function unreadCount() {
  return api.get<{ count: number }>("/matching/messages/unread/count");
}

// --- Admin: Apprenants ---
export function listApprenants() {
  return api.get<ApprenantDetail[]>("/matching/admin/apprenants");
}
