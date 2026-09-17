import { api } from "./client";
import type { ContactMessage, ContactRequestAdmin, ContactRequestClient, ContactRequestPrestataire } from "./types";

export function createContactRequest(prestataireId: number, message?: string) {
  return api.post<ContactRequestClient>("/contact-requests", { prestataire_id: prestataireId, message });
}

export function myContactRequestsAsClient() {
  return api.get<ContactRequestClient[]>("/contact-requests/me/client");
}

export function myContactRequestsAsPrestataire() {
  return api.get<ContactRequestPrestataire[]>("/contact-requests/me/prestataire");
}

export function adminListContactRequests() {
  return api.get<ContactRequestAdmin[]>("/contact-requests/admin");
}

export function reviewContactRequest(id: number, status: "approved" | "rejected") {
  return api.patch<ContactRequestAdmin>(`/contact-requests/${id}/review`, { status });
}

export function getContactMessages(requestId: number) {
  return api.get<ContactMessage[]>(`/contact-requests/${requestId}/messages`);
}

export function sendContactMessage(requestId: number, content: string) {
  return api.post<ContactMessage>(`/contact-requests/${requestId}/messages`, { content });
}

export function unreadContactMessageCount() {
  return api.get<{ count: number }>("/contact-requests/unread/count");
}
