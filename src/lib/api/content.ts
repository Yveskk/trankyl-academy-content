import { api } from "./client";
import type { ContentSection } from "./types";

export function getSection(key: string) {
  return api.get<ContentSection>(`/content/sections/${key}`);
}

export function adminGetSection(key: string) {
  return api.get<ContentSection>(`/content/admin/sections/${key}`);
}

export function adminUpsertSection(key: string, payload: { title: string; subtitle?: string; is_active: boolean }) {
  return api.put<ContentSection>(`/content/admin/sections/${key}`, payload);
}
