import { ApiError } from "$lib/api/client";
import { getModule } from "$lib/api/curriculum";
import type { ModuleItem } from "$lib/api/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  let module: ModuleItem | null = null;
  let apiError: string | null = null;

  try {
    module = await getModule(Number(params.id));
  } catch (e) {
    apiError =
      e instanceof ApiError
        ? e.status === 404
          ? "Module introuvable."
          : e.message
        : "Impossible de contacter le serveur Trankyl Academy. Verifiez que l'API est demarree.";
  }

  return { module, apiError };
};
