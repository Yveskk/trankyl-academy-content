import { browser } from "$app/environment";
import { getLocations, searchProviders, type SearchParams, type SearchResponse } from "$lib/api/directory";
import { paramsFromUrl } from "$lib/utils/searchParams";
import { i18n } from "$lib/stores/locale.svelte";
import { site } from "$lib/stores/site.svelte";
import type { PageLoad } from "./$types";

const PAGE_SIZE = 12;

export const load: PageLoad = async ({ url, fetch, parent }) => {
  const layout = await parent();
  const country = browser ? site.country : layout.country;
  const lang = (browser ? i18n.locale : layout.locale) as "fr" | "en";
  const params = paramsFromUrl(url.searchParams);
  const base: SearchParams = { ...params, country, lang, limit: PAGE_SIZE };
  let autoAvailability = false;
  let search: SearchResponse | null = null;
  let error: string | null = null;

  try {
    search = await searchProviders(base, fetch);
    // Texte libre qui exprime une urgence ("fuit depuis hier") et filtre de
    // disponibilite non choisi : on l'applique, comme le fait l'interface.
    const urgency = search.interpretation.urgency;
    if (!url.searchParams.has("dispo") && params.q && urgency) {
      search = await searchProviders({ ...base, availability: urgency }, fetch);
      autoAvailability = true;
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const locations = await getLocations(country, fetch).catch(() => []);
  return { params: { ...params, availability: autoAvailability ? search!.interpretation.urgency! : params.availability }, search, locations, error, autoAvailability, pageSize: PAGE_SIZE };
};
