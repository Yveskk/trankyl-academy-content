import { PUBLIC_API_URL } from "$env/static/public";
import { api, ApiError, scopeHeaders } from "./client";

// ---------------------------------------------------------------------------
// Lecture publique : GET /home (une seule requete pour toute la page)
// ---------------------------------------------------------------------------
export type HomeItem = {
  id: number | null;
  kind: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  icon: string | null;
  image_url: string | null;
  tone: string | null;
  link_url: string | null;
  ref_type: string | null;
  ref_id: number | null;
  data: Record<string, any>;
  /** services : initiales de l'icone */
  code?: string;
};

export type TopProvider = {
  vendor_id: number;
  name: string;
  initials: string;
  job: string | null;
  city: string | null;
  image_url: string | null;
  rating: number | null;
  reviews_count: number;
  missions: number;
  badges: { verified: boolean; certified: boolean; insured: boolean; top: boolean };
  profile_url: string;
};

export type NewsArticle = {
  id: number;
  title: string;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  link_url: string;
};

export type HeroSlide = {
  id: string;
  image_url: string;
  image_url_mobile: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  link_url: string | null;
  /** Public vise : espace client, espace prestataire, ou les deux. */
  audience?: "client" | "prestataire" | "both";
};

export type Testimonial = { rating: number; text: string; author: string; manual: boolean };

export type HomeSection = {
  key: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  payload: Record<string, any>;
  items: HomeItem[];
  data?: {
    countries?: { code: string; name: string; payment_text?: string | null; help_url?: string | null }[];
    default_country?: string | null;
    providers?: TopProvider[];
    articles?: NewsArticle[];
    reviews?: Testimonial[];
    slides?: HeroSlide[];
  };
};

export type HomeResponse = {
  version: string;
  lang: "fr" | "en";
  country: string;
  order: string[];
  sections: Record<string, HomeSection>;
};

// Dedoublonnage cote navigateur : la page ET la bande verte demandent la meme
// ressource au meme instant ; on ne part qu'une fois sur le reseau.
const inflight = new Map<string, { at: number; promise: Promise<HomeResponse> }>();
const CLIENT_TTL_MS = 15_000;

async function fetchHome(f: typeof fetch, lang: string, country: string): Promise<HomeResponse> {
  const res = await f(`${PUBLIC_API_URL}/home?lang=${encodeURIComponent(lang)}&country=${encodeURIComponent(country)}`);
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return (await res.json()) as HomeResponse;
}

/**
 * `f` : passer le `fetch` fourni par SvelteKit dans une fonction `load` pour
 * que la reponse obtenue cote serveur soit reutilisee a l'hydratation (pas de
 * seconde requete, pas de contenu qui clignote).
 */
export function getHome(lang: string, country: string, f?: typeof fetch): Promise<HomeResponse> {
  if (f) return fetchHome(f, lang, country);
  const key = `${lang}:${country}`;
  const hit = inflight.get(key);
  if (hit && Date.now() - hit.at < CLIENT_TTL_MS) return hit.promise;
  const promise = fetchHome(fetch, lang, country);
  inflight.set(key, { at: Date.now(), promise });
  promise.catch(() => inflight.delete(key));
  return promise;
}

export function clearHomeCache() {
  inflight.clear();
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------
export type AdminItem = {
  id: number | null;
  section_key: string;
  kind: string | null;
  sort_order: number;
  is_active: boolean;
  title: string | null;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  body: string | null;
  body_en: string | null;
  icon: string | null;
  image_url: string | null;
  tone: string | null;
  link_url: string | null;
  ref_type: "sub_category" | "vendor" | null;
  ref_id: number | null;
  data: Record<string, any>;
  starts_at: string | null;
  ends_at: string | null;
};

export type AdminSection = {
  key: string;
  type: string;
  persisted: boolean;
  items_persisted: boolean;
  title: string | null;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  payload: Record<string, any>;
  payload_en: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  items: AdminItem[];
};

export type AdminSectionInput = Pick<
  AdminSection,
  "title" | "title_en" | "subtitle" | "subtitle_en" | "payload" | "payload_en" | "is_active" | "sort_order"
>;

export type AdminItemInput = Omit<AdminItem, "id" | "section_key">;

export const adminHomeConfig = () => api.get<AdminSection[]>("/home/admin/config");
export const adminPutSection = (key: string, body: AdminSectionInput) => api.put<AdminSection>(`/home/admin/sections/${key}`, body);
export const adminInitializeSection = (key: string) => api.post<AdminSection>(`/home/admin/sections/${key}/initialize`);
export const adminSectionsOrder = (keys: string[]) => api.post<{ ok: boolean }>("/home/admin/sections-order", { keys });
export const adminCreateItem = (section_key: string, body: AdminItemInput) => api.post<AdminItem>("/home/admin/items", { section_key, ...body });
export const adminUpdateItem = (id: number, body: AdminItemInput) => api.put<AdminItem>(`/home/admin/items/${id}`, body);
export const adminDeleteItem = (id: number) => api.delete(`/home/admin/items/${id}`);
export const adminReorderItems = (key: string, ids: number[]) => api.post<{ ok: boolean }>(`/home/admin/sections/${key}/reorder`, { ids });
export const adminCatalogSubCategories = (q = "") =>
  api.get<{ id: number; name: string; name_en: string | null; category: string | null }[]>(`/home/admin/catalog/sub-categories?q=${encodeURIComponent(q)}`);
export const adminCatalogProviders = (q = "") =>
  api.get<{ id: number; name: string; city: string | null }[]>(`/home/admin/catalog/providers?q=${encodeURIComponent(q)}`);

/** Envoie une image (affiche, visuel) vers Cloudinary et retourne son URL publique. */
export async function adminUploadImage(file: File): Promise<{ url: string }> {
  const { auth } = await import("$lib/stores/auth.svelte");
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${PUBLIC_API_URL}/home/admin/upload-image`, {
    method: "POST",
    headers: { ...scopeHeaders(), ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
    body,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : detail;
    } catch {
      // pas de corps JSON
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as { url: string };
}
