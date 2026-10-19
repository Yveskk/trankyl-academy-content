import type { SearchParams } from "$lib/api/directory";

/** Parametres d'URL (courts, lisibles) -> parametres de l'API. */
export function paramsFromUrl(sp: URLSearchParams): SearchParams {
  const dispo = sp.get("dispo");
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  return {
    q: sp.get("q") ?? "",
    availability: dispo === "today" || dispo === "tomorrow" || dispo === "weekend" ? dispo : "",
    min_rating: Number(sp.get("note") || 0),
    identity: sp.get("id") === "1",
    certified: sp.get("cert") === "1",
    insured: sp.get("ass") === "1",
    top: sp.get("top") === "1",
    languages: (sp.get("langs") ?? "").split(",").filter(Boolean),
    sort: (["rating", "price", "distance", "missions"].includes(sp.get("tri") ?? "") ? sp.get("tri") : "recommended") as SearchParams["sort"],
    city: sp.get("ville") ?? "",
    district: sp.get("quartier") ?? "",
    lat: lat && lng ? Number(lat) : null,
    lng: lat && lng ? Number(lng) : null,
  };
}
