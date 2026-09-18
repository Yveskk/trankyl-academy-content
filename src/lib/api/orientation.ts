import { api } from "./client";

export function orientationChat(message: string, history?: { role: string; content: string }[]) {
  return api.post<{ response: string }>("/orientation/chat", { message, history });
}
