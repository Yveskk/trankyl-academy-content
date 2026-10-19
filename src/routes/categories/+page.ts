import { browser } from "$app/environment";
import { getCatalog } from "$lib/api/directory";
import { i18n } from "$lib/stores/locale.svelte";
import { site } from "$lib/stores/site.svelte";
import type { PageLoad } from "./$types";

// Tout le catalogue en UNE requete (cachee cote serveur) ; la recherche, le tri
// et les lettres se font ensuite dans le navigateur, sans aller-retour reseau.
export const load: PageLoad = async ({ fetch, parent }) => {
  const layout = await parent();
  const country = browser ? site.country : layout.country;
  const lang = browser ? i18n.locale : layout.locale;
  try {
    return { catalog: await getCatalog(country, lang, fetch), error: null as string | null };
  } catch {
    return { catalog: null, error: "Impossible de contacter le serveur Trankyl. Réessayez dans un instant." };
  }
};
