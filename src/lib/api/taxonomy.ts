import { api } from "./client";
import type { Metier, MetierDetail, Niveau } from "./types";

export function listMetiers() {
  return api.get<Metier[]>("/taxonomy/metiers");
}

export function getMetier(code: string) {
  return api.get<MetierDetail>(`/taxonomy/metiers/${code}`);
}

export function adminListMetiers() {
  return api.get<Metier[]>("/taxonomy/admin/metiers");
}

export function adminGetMetier(metierId: number) {
  return api.get<MetierDetail>(`/taxonomy/admin/metiers/${metierId}`);
}

export function createMetier(payload: { code: string; nom: string; description?: string }) {
  return api.post<Metier>("/taxonomy/metiers", payload);
}

export function updateMetier(
  metierId: number,
  payload: { code: string; nom: string; description?: string; is_active: boolean }
) {
  return api.put<Metier>(`/taxonomy/metiers/${metierId}`, payload);
}

export function createNiveau(
  metierId: number,
  payload: { numero: number; nom: string; description?: string; date_debut?: string | null }
) {
  return api.post<Niveau>(`/taxonomy/metiers/${metierId}/niveaux`, payload);
}

export function updateNiveau(
  niveauId: number,
  payload: { numero: number; nom: string; description?: string; date_debut?: string | null }
) {
  return api.put<Niveau>(`/taxonomy/niveaux/${niveauId}`, payload);
}

export function createCompetence(
  niveauId: number,
  payload: { code: string; titre: string; description?: string; ordre?: number }
) {
  return api.post(`/taxonomy/niveaux/${niveauId}/competences`, payload);
}

export function deleteMetier(metierId: number) {
  return api.delete(`/taxonomy/metiers/${metierId}`);
}

export function deleteNiveau(niveauId: number) {
  return api.delete(`/taxonomy/niveaux/${niveauId}`);
}

export function deleteCompetence(competenceId: number) {
  return api.delete(`/taxonomy/competences/${competenceId}`);
}
