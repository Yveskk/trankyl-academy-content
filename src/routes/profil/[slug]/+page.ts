import { browser } from "$app/environment";
import { error } from "@sveltejs/kit";
import { getProviderProfile } from "$lib/api/directory";
import { i18n } from "$lib/stores/locale.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch, parent }) => {
  const layout = await parent();
  const lang = (browser ? i18n.locale : layout.locale) as "fr" | "en";
  try {
    return { profile: await getProviderProfile(params.slug, lang, fetch), lang: lang as string };
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404) error(404, "Prestataire introuvable");
    error(502, "Impossible de contacter le serveur Trankyl. Réessayez dans un instant.");
  }
};
