import { listMetiers } from "$lib/api/taxonomy";
import type { Metier } from "$lib/api/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  let metiers: Metier[] = [];
  let apiError: string | null = null;

  try {
    metiers = await listMetiers();
  } catch {
    apiError = "Impossible de contacter le serveur Trankyl Academy. Verifiez que l'API est demarree.";
  }

  return { metiers, apiError };
};
