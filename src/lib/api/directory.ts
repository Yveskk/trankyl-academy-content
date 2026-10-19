import { PUBLIC_API_URL } from "$env/static/public";
import { ApiError, scopeHeaders } from "./client";

// ---------------------------------------------------------------------------
// Recherche : GET /directory/search
// ---------------------------------------------------------------------------
export type SearchItem = {
  vendor_id: number;
  name: string;
  initials: string;
  image_url: string | null;
  job: string | null;
  city: string | null;
  rating: number | null;
  reviews_count: number;
  missions: number;
  distance_km: number | null;
  response_minutes: number | null;
  price_from: number | null;
  quote: string | null;
  languages: string[];
  badges: { verified: boolean; certified: boolean; insured: boolean; top: boolean };
  availability_known: boolean;
  next_slot: string | null; // "Auj.|14h"
  next_slot_iso: string | null;
  available_today: boolean;
  lat: number | null;
  lng: number | null;
  profile_url: string;
};

export type Interpretation = {
  label: string | null;
  keywords: string[];
  urgency: "today" | "tomorrow" | "weekend" | null;
  budget: { low: number; high: number } | null;
  subcategory_ids: number[];
  city: string | null;
  district: string | null;
};

export type SearchResponse = { total: number; items: SearchItem[]; interpretation: Interpretation };

export type SearchParams = {
  q?: string;
  availability?: "today" | "tomorrow" | "weekend" | "";
  min_rating?: number;
  identity?: boolean;
  certified?: boolean;
  insured?: boolean;
  top?: boolean;
  languages?: string[];
  sort?: "recommended" | "rating" | "price" | "distance" | "missions";
  city?: string;
  district?: string;
  lat?: number | null;
  lng?: number | null;
  country?: string;
  lang?: string;
  limit?: number;
  offset?: number;
};

function toQuery(p: SearchParams): string {
  const u = new URLSearchParams();
  if (p.q) u.set("q", p.q);
  if (p.availability) u.set("availability", p.availability);
  if (p.min_rating) u.set("min_rating", String(p.min_rating));
  for (const k of ["identity", "certified", "insured", "top"] as const) if (p[k]) u.set(k, "true");
  if (p.languages?.length) u.set("languages", p.languages.join(","));
  if (p.sort && p.sort !== "recommended") u.set("sort", p.sort);
  if (p.city) u.set("city", p.city);
  if (p.district) u.set("district", p.district);
  if (p.lat != null && p.lng != null) {
    u.set("lat", String(p.lat));
    u.set("lng", String(p.lng));
  }
  u.set("country", p.country ?? "TG");
  u.set("lang", p.lang ?? "fr");
  u.set("limit", String(p.limit ?? 12));
  if (p.offset) u.set("offset", String(p.offset));
  return u.toString();
}

async function getJson<T>(f: typeof fetch, path: string): Promise<T> {
  // Pays et langue du visiteur sur CHAQUE appel : le pays est porte par les services publies, pas par le prestataire.
  const res = await f(`${PUBLIC_API_URL}${path}`, { headers: scopeHeaders() });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      // pas de corps JSON
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : res.statusText);
  }
  return (await res.json()) as T;
}

export const searchProviders = (p: SearchParams, f: typeof fetch = fetch) => getJson<SearchResponse>(f, `/directory/search?${toQuery(p)}`);

export type CategoryEntry = { id: number; name: string };
/** Metiers proposes a l'inscription d'un prestataire. */
export const getCategories = (lang = "fr", f: typeof fetch = fetch) =>
  getJson<{ categories: CategoryEntry[] }>(f, `/directory/categories?lang=${encodeURIComponent(lang)}`).then((r) => r.categories);

export type LocationEntry = { city: string; districts: string[] };
export const getLocations = (country = "TG", f: typeof fetch = fetch) =>
  getJson<{ locations: LocationEntry[] }>(f, `/directory/locations?country=${encodeURIComponent(country)}`).then((r) => r.locations);

// ---------------------------------------------------------------------------
// Profil public : GET /directory/providers/{ref}
// ---------------------------------------------------------------------------
export type ProviderProfile = {
  vendor_id: number;
  slug: string;
  name: string;
  short_name: string;
  initials: string;
  image_url: string | null;
  cover_image_url: string | null;
  job: string | null;
  city: string | null;
  districts: string[];
  member_since: number | null;
  years_experience: number | null;
  languages: string[];
  headline: string | null;
  about: string | null;
  badges: { identity: boolean; address: boolean; certified: string[]; insured: boolean; top: boolean; top_year: number };
  stats: { rating: number | null; reviews_count: number; missions: number; response_minutes: number | null; on_time_rate: number | null };
  services: { id: number; title: string; subtitle: string | null; price: number | null }[];
  services_note: string | null;
  media: { id: number; kind: string; url: string; thumb_url: string | null; caption: string | null }[];
  trainings: { title: string; level: number; delivered_at: string | null }[];
  reviews: {
    average: number | null;
    count: number;
    criteria: { key: string; value: number }[];
    items: { rating: number; comment: string | null; author: string; created_at: string | null; reply: string | null; verified: boolean }[];
  };
  booking: { visit_fee: number | null; availability_known: boolean; slots: { label: string; iso: string }[] };
  share: { url: string; ref: string };
  zone: { lat: number | null; lng: number | null; radius_km: number | null; label: string | null };
};

export const getProviderProfile = (ref: string, lang = "fr", f: typeof fetch = fetch) =>
  getJson<ProviderProfile>(f, `/directory/providers/${encodeURIComponent(ref)}?lang=${lang}&reviews_limit=10`);

// ---------------------------------------------------------------------------
// Services detailles : GET /directory/providers/{ref}/services (page Reserver)
// ---------------------------------------------------------------------------
export type ProviderService = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  experience: string | null;
  includes: string[];
  tools: string[];
  options: string[];
  category: string | null;
};

export type ProviderServices = {
  vendor_id: number;
  services: ProviderService[];
  visit_fee: number | null;
  note: string | null;
  min_price: number | null;
};

export const getProviderServices = (ref: string, lang = "fr", f: typeof fetch = fetch) =>
  getJson<ProviderServices>(f, `/directory/providers/${encodeURIComponent(ref)}/services?lang=${lang}`);

// ---------------------------------------------------------------------------
// Catalogue des metiers : GET /directory/catalog (page "Toutes les categories")
// ---------------------------------------------------------------------------
export type CatalogItem = { id: number; name: string; description: string | null; image_url: string | null; providers: number; services: number };
export type Catalog = { total: number; items: CatalogItem[] };
export const getCatalog = (country = "TG", lang = "fr", f: typeof fetch = fetch) => getJson<Catalog>(f, `/directory/catalog?country=${encodeURIComponent(country)}&lang=${encodeURIComponent(lang)}`);
