import { api } from "./client";
import type { ModuleItem, Quiz } from "./types";

export function listModules(competenceId?: number) {
  const query = competenceId ? `?competence_id=${competenceId}` : "";
  return api.get<ModuleItem[]>(`/curriculum/modules${query}`);
}

export function getModule(moduleId: number) {
  return api.get<ModuleItem>(`/curriculum/modules/${moduleId}`);
}

export function getModuleQuiz(moduleId: number) {
  return api.get<Quiz>(`/curriculum/modules/${moduleId}/quiz`);
}

export function createModule(payload: {
  competence_id: number;
  code: string;
  titre: string;
  contenu?: string;
  titre_en?: string;
  contenu_en?: string;
  duree_heures?: number;
  ordre?: number;
}) {
  return api.post<ModuleItem>("/curriculum/modules", payload);
}

export function updateModule(
  moduleId: number,
  payload: {
    code: string;
    titre: string;
    contenu?: string;
    titre_en?: string;
    contenu_en?: string;
    duree_heures?: number;
    ordre?: number;
  }
) {
  return api.put<ModuleItem>(`/curriculum/modules/${moduleId}`, payload);
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
  return api.post<Quiz>("/curriculum/quizzes", payload);
}

export function deleteModule(moduleId: number) {
  return api.delete(`/curriculum/modules/${moduleId}`);
}
