import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { Metier, MetierDetail } from "./types";

export function listMetiers() {
  if (USE_MOCK_DATA) return mock.mockListMetiers();
  return api.get<Metier[]>("/taxonomy/metiers");
}

export function getMetier(code: string) {
  if (USE_MOCK_DATA) return mock.mockGetMetier(code);
  return api.get<MetierDetail>(`/taxonomy/metiers/${code}`);
}

export function createMetier(payload: { code: string; nom: string; description?: string }) {
  if (USE_MOCK_DATA) return mock.mockCreateMetier(payload);
  return api.post<Metier>("/taxonomy/metiers", payload);
}

export function createNiveau(metierId: number, payload: { numero: number; nom: string; description?: string }) {
  if (USE_MOCK_DATA) return mock.mockCreateNiveau(metierId, payload);
  return api.post(`/taxonomy/metiers/${metierId}/niveaux`, payload);
}

export function createCompetence(
  niveauId: number,
  payload: { code: string; titre: string; description?: string; ordre?: number }
) {
  if (USE_MOCK_DATA) return mock.mockCreateCompetence(niveauId, payload);
  return api.post(`/taxonomy/niveaux/${niveauId}/competences`, payload);
}

export function deleteMetier(metierId: number) {
  if (USE_MOCK_DATA) return mock.mockDeleteMetier(metierId);
  return api.delete(`/taxonomy/metiers/${metierId}`);
}
