import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { ApiError, api, scopeHeaders } from "./client";

// ---------- Etat du parcours
export interface MissingItem {
  key: string;
  label: string;
}
export interface Onboarding {
  profile: { complete: boolean; missing: string[] };
  enrollment: { status: "none" | "draft" | "pending" | "approved" | "rejected"; submitted: boolean; missing: MissingItem[]; admin_note: string | null };
  dashboard_unlocked: boolean;
  next_step: "profile" | "enrollment" | "dashboard";
}
export interface SpaceOptions {
  countries: { id: number; name: string }[];
  currencies: { id: number; label: string }[];
  districts: { id: number; name: string }[];
}

// ---------- Profil (memes champs que l'ancien site)
export interface ProviderProfile {
  fname: string;
  family_name: string;
  email: string;
  phone: string;
  country_code: string;
  sex: "Male" | "Female" | "";
  dob: string;
  address: string;
  vendor_address_country: string;
  vendor_address_city: string;
  street_number: string;
  street_name: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  geolocation: string;
  bio: string;
  if_company: boolean;
  company_name: string;
  vendor_currency: string;
  working_district: string;
  image: string | null;
  complete: boolean;
  missing?: string[];
}

// ---------- Formulaire d'enrolement
export interface Enrollment {
  id: number;
  status: "draft" | "pending" | "approved" | "rejected";
  is_professional: number;
  is_expert: number;
  if_company: number;
  company_name: string;
  company_sector: string;
  company_type: string;
  study_level: string;
  languages: string;
  custom_language: string;
  id_type: string;
  id_number: string;
  id_file: string;
  id_file_verso: string;
  rc_file: string;
  casier_file: string;
  cef_files: string[];
  diploma_files: string[];
  cv_files: string[];
  has_signature: boolean;
  signature: string | null;
  signature_pending: boolean;
  contract_pdf: string | null;
  admin_note: string | null;
}
export interface EnrollmentResponse {
  enrollment: Enrollment | null;
  missing: MissingItem[];
  contract_text?: string;
}

// ---------- Tableau de bord
export interface Dashboard {
  /** Abonnement PRO ; null si l'information est indisponible. */
  subscription: { active: boolean; ends_at: string | null; days_left: number; ever: boolean } | null;
  id: number;
  name: string;
  city: string;
  photo: string | null;
  enrollment_status: string;
  enrollment_note: string | null;
  new_requests: number;
  verification: { steps: { key: string; label: string; status: "validated" | "review" | "todo"; detail: string | null }[]; done: number; total: number; percent: number; label: string };
  stats: { revenue_month: number; profile_views: number | null; acceptance_rate: number | null; loyal_clients: number };
  recent: { id: number; ref: string; client: string | null; service: string | null; amount: number; status: "pending" | "completed" | "cancelled"; date: string | null }[];
}

export const getOnboarding = () => api.get<Onboarding>("/provider-space/onboarding");
export const getSpaceOptions = () => api.get<SpaceOptions>("/provider-space/options");
export const getProviderProfile = () => api.get<ProviderProfile>("/provider-space/profile");
export const getEnrollment = () => api.get<EnrollmentResponse>("/provider-space/enrollment");
export const submitEnrollment = () => api.post<Onboarding>("/provider-space/enrollment/submit");
export const getDashboard = () => api.get<Dashboard>("/provider-space/dashboard");

/** Envoi multipart (profil, enrolement) : les erreurs de champs reviennent dans `fields`. */
async function send<T>(method: "PUT" | "POST", path: string, body: FormData): Promise<T> {
  const headers = new Headers(scopeHeaders());
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
  const res = await fetch(`${PUBLIC_API_URL}${path}`, { method, headers, body });
  if (!res.ok) {
    let detail: any = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      // pas de corps JSON
    }
    if (Array.isArray(detail)) detail = detail[0]?.msg ?? res.statusText;
    if (detail && typeof detail === "object") throw new ApiError(res.status, String(detail.message ?? "Erreur"), detail);
    throw new ApiError(res.status, String(detail));
  }
  return res.json();
}

export const saveProviderProfile = (fd: FormData) => send<ProviderProfile>("PUT", "/provider-space/profile", fd);
export const saveEnrollment = (fd: FormData) => send<EnrollmentResponse>("PUT", "/provider-space/enrollment", fd);

// ---------- Localisation : position (GPS ou lien Google Maps) -> pays, ville, rue, code postal
export interface Place {
  latitude: number;
  longitude: number;
  country_id: number | null;
  country_code: string;
  city: string;
  street_number: string;
  street_name: string;
  postal_code: string;
  address: string;
  area: string;
  geolocation: string;
}
export const geocodeReverse = (lat: number, lng: number) => api.get<Place>(`/provider-space/geocode/reverse?lat=${lat}&lng=${lng}`);
export const geocodeLink = (url: string) => api.get<Place>(`/provider-space/geocode/link?url=${encodeURIComponent(url)}`);

// ---------- Travail du prestataire : demandes, devis, agenda, paiements, avis, profil public
export type ReqStatus = "pending" | "completed" | "cancelled";
export interface WorkRequest {
  id: number;
  ref: string;
  status: ReqStatus;
  date: string | null;
  time: string | null;
  service: string | null;
  qty: number | null;
  client_name: string | null;
  client_phone: string | null;
  address: string | null;
  info: string | null;
  map_link: string | null;
  total: number;
  payment_method: string | null;
  paid: boolean;
  created_at: string | null;
  cancellation_reason: string | null;
}
export interface RequestList {
  total: number;
  page: number;
  page_size: number;
  counts: { pending: number; completed: number; cancelled: number; all: number };
  items: WorkRequest[];
}
export interface WorkQuote {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  slot_label: string | null;
  status: "new" | "answered";
  created_at: string | null;
  reply_subject: string | null;
  reply_message: string | null;
  replied_at: string | null;
}
export interface Slot {
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}
export interface Payments {
  totals: { earned: number; month: number; to_receive: number; pending_missions: number; completed_count: number };
  months: { month: string; amount: number }[];
  items: WorkRequest[];
}
export interface WorkReview {
  id: number;
  rating: number;
  comment: string | null;
  status: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string | null;
  client: string | null;
}
export interface PublicProfile {
  verified: boolean;
  url: string;
  headline: string | null;
  about: string | null;
  cover_image_url: string | null;
  years_experience: number | null;
  visit_fee: number | null;
  service_radius_km: number | null;
  zone_label: string | null;
  services_note: string | null;
  media: { id: number; kind: string; url: string; caption: string | null; is_active: boolean }[];
  services: { id: number; title: string; min_price: string | number | null; is_active: boolean; image: string | null }[];
}

export const listRequests = (p: { status?: string; q?: string; page?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  return api.get<RequestList>(`/provider-space/requests?${qs}`);
};
export const setRequestStatus = (id: number, status: "completed" | "cancelled", reason?: string) => api.post(`/provider-space/requests/${id}/status`, { status, reason: reason || null });
export const listQuotes = () => api.get<WorkQuote[]>("/provider-space/quotes");
export const replyQuote = (id: number, subject: string, message: string) => api.post<WorkQuote>(`/provider-space/quotes/${id}/reply`, { subject, message });
export const getAvailability = () => api.get<Slot[]>("/provider-space/availability");
export const saveAvailability = (slots: Slot[]) => api.put<Slot[]>("/provider-space/availability", slots);
export const getAgenda = (from: string, days = 14) => api.get<{ from: string; to: string; items: WorkRequest[] }>(`/provider-space/agenda?date_from=${from}&days=${days}`);
export const getPayments = () => api.get<Payments>("/provider-space/payments");
export const getMyReviews = () => api.get<{ average: number | null; count: number; items: WorkReview[] }>("/provider-space/reviews");
export const replyReview = (id: number, reply: string) => api.post(`/provider-space/reviews/${id}/reply`, { reply });
export const getPublicProfile = () => api.get<PublicProfile>("/provider-space/public-profile");
export const savePublicProfile = (b: Partial<PublicProfile>) => api.put<PublicProfile>("/provider-space/public-profile", b);
export const uploadCover = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return send<{ cover_image_url: string }>("POST", "/provider-space/public-profile/cover", fd);
};
export const removeCover = () => api.delete("/provider-space/public-profile/cover");
export const addMedia = (file: File, caption: string) => {
  const fd = new FormData();
  fd.append("file", file);
  return send<PublicProfile["media"][number]>("POST", `/provider-space/public-profile/media?caption=${encodeURIComponent(caption)}`, fd);
};
export const patchMedia = (id: number, b: { is_active?: boolean; caption?: string }) => api.patch(`/provider-space/public-profile/media/${id}`, b);
export const deleteMedia = (id: number) => api.delete(`/provider-space/public-profile/media/${id}`);
export const setServiceVisibility = (id: number, is_active: boolean) => api.patch(`/provider-space/services/${id}/visibility`, { is_active });
