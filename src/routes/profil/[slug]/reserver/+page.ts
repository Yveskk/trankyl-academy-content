import { browser } from "$app/environment";
import { error } from "@sveltejs/kit";
import { getBookingOptions } from "$lib/api/bookings";
import { getProviderProfile } from "$lib/api/directory";
import { i18n } from "$lib/stores/locale.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url, fetch, parent }) => {
  const layout = await parent();
  const lang = (browser ? i18n.locale : layout.locale) as "fr" | "en";
  try {
    const profile = await getProviderProfile(params.slug, lang, fetch);
    const options = await getBookingOptions(String(profile.vendor_id));
    return {
      profile,
      options,
      lang: lang as string,
      // Pre-selection venant de la fiche du prestataire ou de la recherche : ?service=<id>&slot=<iso>
      slotIso: url.searchParams.get("slot"),
      serviceId: Number(url.searchParams.get("service")) || null,
    };
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404) error(404, "Prestataire introuvable");
    error(502, "Impossible de contacter le serveur Trankyl. Réessayez dans un instant.");
  }
};
