import { browser } from "$app/environment";
import { getHome } from "$lib/api/home";
import { i18n } from "$lib/stores/locale.svelte";
import { site } from "$lib/stores/site.svelte";
import type { PageLoad } from "./$types";

// Toute la page en UNE requete (GET /home). Cote serveur la langue/pays sont
// ceux par defaut (fr / TG) ; cote navigateur, ceux choisis par le visiteur.
export const load: PageLoad = async ({ fetch, parent }) => {
  const layout = await parent();
  // Serveur : pays/langue des cookies ; navigateur : ceux choisis par le visiteur (stores).
  const lang = browser ? i18n.locale : layout.locale;
  const country = browser ? site.country : layout.country;
  try {
    return { home: await getHome(lang as "fr" | "en", country, fetch), error: null as string | null };
  } catch {
    return { home: null, error: "Impossible de contacter le serveur Trankyl. Réessayez dans un instant." };
  }
};
