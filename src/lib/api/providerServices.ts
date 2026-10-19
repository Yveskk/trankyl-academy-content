import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { ApiError, api, scopeHeaders } from "./client";

const B = "/provider-space/services";

export interface CatalogUnit { id: number; label: string }
export interface CatalogSub { id: number; name: string; description: string | null; image_url: string | null; units: CatalogUnit[] }
export interface CatalogCategory { id: number; name: string; subcategories: CatalogSub[] }

export interface City { id: number; name: string; districts: { id: number; name: string }[] }
export interface Locations { country: { id: number; name: string | null }; cities: City[]; default_city_id: number | null }

export interface ServiceCard {
  id: number;
  title: string;
  category: string | null;
  subcategory: { id: number | null; name: string | null };
  min_price: number;
  units: { unit_id: number; label: string | null; price: number }[];
  options: { name: string; price: number }[];
  images: string[];
  image: string | null;
  is_active: boolean;
  type: "home" | "online";
  city: string | null;
  districts: string[];
  created_at: string | null;
  stats: { bookings: number; completed: number; revenue: number };
}
export interface ServiceDetail extends ServiceCard {
  description: string;
  experience_years: number;
  tools: string[];
  notes: string;
  city_id: number | null;
  district_ids: number[];
}
export interface ServiceInput {
  subcategory_id: number;
  title: string;
  description: string;
  experience_years: number;
  units: { unit_id: number; price: number }[];
  options: { name: string; price: number }[];
  tools: string[];
  notes: string;
  images: string[];
  type: "home" | "online";
  city_id: number | null;
  district_ids: number[];
  is_active: boolean;
}

export const getServiceCatalog = (lang: string) => api.get<{ categories: CatalogCategory[] }>(`${B}/catalog?lang=${lang}`);
export const getServiceLocations = () => api.get<Locations>(`${B}/locations`);
export const listMyServices = (lang: string) => api.get<{ total: number; active: number; limit: number; items: ServiceCard[] }>(`${B}?lang=${lang}`);
export const getMyService = (id: number, lang: string) => api.get<ServiceDetail>(`${B}/${id}?lang=${lang}`);
export const createMyService = (b: ServiceInput) => api.post<{ id: number }>(B, b);
export const updateMyService = (id: number, b: ServiceInput) => api.put<{ id: number }>(`${B}/${id}`, b);
export const deleteMyService = (id: number) => api.delete(`${B}/${id}`);
export const duplicateMyService = (id: number) => api.post<{ id: number }>(`${B}/${id}/duplicate`);
export const setMyServiceVisibility = (id: number, is_active: boolean) => api.patch(`${B}/${id}/visibility`, { is_active });

export const uploadServiceImage = (file: File) => uploadFor(`${B}/images`, file);

/** Envoie une photo vers l'endpoint donne (espace prestataire ou administration) et renvoie son URL. */
export async function uploadFor(path: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const headers = new Headers(scopeHeaders());
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
  const res = await fetch(`${PUBLIC_API_URL}${path}`, { method: "POST", headers, body: fd });
  if (!res.ok) {
    let detail: any = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      // pas de corps JSON
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Envoi de la photo impossible.");
  }
  return (await res.json()).url as string;
}
