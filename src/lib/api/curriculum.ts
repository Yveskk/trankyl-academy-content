import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { ModuleItem, Quiz } from "./types";

export function listModules(competenceId?: number) {
  if (USE_MOCK_DATA) return mock.mockListModules(competenceId);
  const query = competenceId ? `?competence_id=${competenceId}` : "";
  return api.get<ModuleItem[]>(`/curriculum/modules${query}`);
}

export function getModule(moduleId: number) {
  if (USE_MOCK_DATA) return mock.mockGetModule(moduleId);
  return api.get<ModuleItem>(`/curriculum/modules/${moduleId}`);
}

export function getModuleQuiz(moduleId: number) {
  if (USE_MOCK_DATA) return mock.mockGetModuleQuiz(moduleId);
  return api.get<Quiz>(`/curriculum/modules/${moduleId}/quiz`);
}

export function createModule(payload: {
  competence_id: number;
  code: string;
  titre: string;
  contenu?: string;
  duree_heures?: number;
  ordre?: number;
}) {
  if (USE_MOCK_DATA) return mock.mockCreateModule(payload);
  return api.post<ModuleItem>("/curriculum/modules", payload);
}

export function createQuiz(payload: {
  module_id: number;
  titre: string;
  seuil_reussite_pct?: number;
  questions: {
    texte: string;
    ordre?: number;
    choix: { texte: string; est_correct: boolean; ordre?: number }[];
  }[];
}) {
  if (USE_MOCK_DATA) return mock.mockCreateQuiz(payload);
  return api.post<Quiz>("/curriculum/quizzes", payload);
}

export function deleteModule(moduleId: number) {
  if (USE_MOCK_DATA) return mock.mockDeleteModule(moduleId);
  return api.delete(`/curriculum/modules/${moduleId}`);
}
