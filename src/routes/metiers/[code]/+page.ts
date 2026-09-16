import { ApiError } from "$lib/api/client";
import { listModules } from "$lib/api/curriculum";
import { getMetier } from "$lib/api/taxonomy";
import type { MetierDetail, ModuleItem } from "$lib/api/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  let metier: MetierDetail | null = null;
  let modulesByCompetence = new Map<number, ModuleItem[]>();
  let apiError: string | null = null;

  try {
    metier = await getMetier(params.code);
    const competenceIds = metier.niveaux.flatMap((n) => n.competences.map((c) => c.id));
    await Promise.all(
      competenceIds.map(async (id) => {
        modulesByCompetence.set(id, await listModules(id));
      })
    );
  } catch (e) {
    apiError =
      e instanceof ApiError
        ? e.status === 404
          ? "Metier introuvable."
          : e.message
        : "Impossible de contacter le serveur Trankyl Academy. Verifiez que l'API est demarree.";
  }

  return { metier, modulesByCompetence, apiError };
};
