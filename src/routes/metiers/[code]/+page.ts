import { ApiError } from "$lib/api/client";
import { getMetier } from "$lib/api/taxonomy";
import type { MetierDetail } from "$lib/api/types";
import { i18n } from "$lib/stores/locale.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  let metier: MetierDetail | null = null;
  let apiError: string | null = null;

  try {
    // Un seul appel : le backend renvoie desormais niveaux -> competences ->
    // modules -> quiz en une seule requete (voir _METIER_DETAIL_LOADER cote
    // API), plus besoin d'un aller-retour par competence ici.
    metier = await getMetier(params.code);
  } catch (e) {
    apiError =
      e instanceof ApiError
        ? e.status === 404
          ? i18n.dict.metierDetail.metierIntrouvable
          : e.message
        : i18n.dict.metierDetail.erreurServeur;
  }

  return { metier, apiError };
};
