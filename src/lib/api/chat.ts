import { api } from "./client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: { id: number; role: string; content: string; created_at: string }[];
}

// --- Sessions ---
export function createChatSession() {
  return api.post<ChatSession>("/matching/chat/sessions");
}

export function listChatSessions() {
  return api.get<ChatSession[]>("/matching/chat/sessions");
}

export function getChatSession(sessionId: number) {
  return api.get<ChatSessionDetail>(`/matching/chat/sessions/${sessionId}`);
}

export function deleteChatSession(sessionId: number) {
  return api.delete(`/matching/chat/sessions/${sessionId}`);
}

// --- Messages ---
export function sendChatMessage(sessionId: number, message: string) {
  return api.post<{ id: number; role: string; content: string }>(
    `/matching/chat/sessions/${sessionId}/messages`,
    { message }
  );
}

// --- Legacy (sans session) ---
export function chatDirect(message: string, history: ChatMessage[] = []) {
  return api.post<{ response: string }>("/matching/chat", { message, history });
}
