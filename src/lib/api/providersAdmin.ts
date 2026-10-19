import { api } from "./client";

export type ProviderListItem = {
  vendor_id: number;
  name: string;
  city: string | null;
  is_verified: boolean;
  academy_status: string | null;
  is_featured: boolean;
  top_override: number | null;
  is_insured: boolean;
};

export type ProviderProfile = {
  vendor_id: number;
  persisted: boolean;
  headline: string | null;
  about: string | null;
  about_en: string | null;
  cover_image_url: string | null;
  response_time_minutes: number | null;
  on_time_rate: number | null;
  is_insured: boolean;
  is_address_verified: boolean;
  top_override: number | null;
  is_featured: boolean;
  featured_order: number;
  public_slug: string | null;
  visit_fee: number | null;
  years_experience: number | null;
  service_radius_km: number | null;
  zone_label: string | null;
  services_note: string | null;
  services_note_en: string | null;
};

export type ProviderProfileInput = Omit<ProviderProfile, "vendor_id" | "persisted">;

export const adminListProviders = (q = "", onlyCertified = true) =>
  api.get<ProviderListItem[]>(`/providers/admin?q=${encodeURIComponent(q)}&only_certified=${onlyCertified}`);
export const adminGetProviderProfile = (id: number) => api.get<ProviderProfile>(`/providers/admin/${id}/profile`);
export const adminPutProviderProfile = (id: number, body: ProviderProfileInput) => api.put<ProviderProfile>(`/providers/admin/${id}/profile`, body);

export type Media = { id: number; vendor_id: number; kind: "photo" | "video" | "before_after"; url: string; thumb_url: string | null; caption: string | null; sort_order: number; is_active: boolean };
export type MediaInput = Omit<Media, "id" | "vendor_id">;
export const adminListMedia = (id: number) => api.get<Media[]>(`/providers/admin/${id}/media`);
export const adminAddMedia = (id: number, body: MediaInput) => api.post<Media>(`/providers/admin/${id}/media`, body);
export const adminDeleteMedia = (mediaId: number) => api.delete(`/providers/admin/media/${mediaId}`);

export type Slot = { weekday: number; start_time: string; end_time: string; is_active: boolean };
export const adminGetAvailability = (id: number) => api.get<Slot[]>(`/providers/admin/${id}/availability`);
export const adminPutAvailability = (id: number, slots: Slot[]) => api.put<Slot[]>(`/providers/admin/${id}/availability`, slots);
