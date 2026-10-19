import type { ServiceCard, ServiceDetail, ServiceInput, CatalogCategory, Locations } from "./providerServices";
import type { SubscriptionRow } from "./providerAccount";
import { api } from "./client";

const B = "/admin-vendors";

export type VendorState = "all" | "active" | "inactive" | "deleted";
export interface VendorRow {
  id: number;
  unique_id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  is_active: boolean;
  deleted: boolean;
  verified: boolean;
  academy_status: string | null;
  referral_code: string | null;
  photo: string | null;
  created_at: string | null;
  profile_complete: boolean;
  services: number;
  subscription_until: string | null;
  has_subscription: boolean;
}
export interface VendorList {
  total: number;
  page: number;
  page_size: number;
  counts: { all: number; active: number; inactive: number; deleted: number };
  items: VendorRow[];
}
export interface VendorDetail {
  id: number;
  unique_id: string;
  firstname: string;
  lastname: string | null;
  email: string | null;
  phone: string;
  sex: string | null;
  city: string | null;
  address: string | null;
  bio: string | null;
  photo: string | null;
  is_active: boolean;
  deleted: boolean;
  verified: boolean;
  academy_status: string | null;
  referral_code: string | null;
  profile_complete: boolean;
  created_at: string | null;
  enrollment: { id: number; status: string; admin_note: string | null } | null;
  stats: { bookings: number; completed: number; pending: number; rating: number | null; reviews: number };
  subscription: { active: SubscriptionRow | null; history: SubscriptionRow[]; pricing: { monthly: number; yearly: number } };
}
export interface VendorInput {
  firstname: string;
  lastname?: string | null;
  email?: string | null;
  sex?: string | null;
  city?: string | null;
  address?: string | null;
  bio?: string | null;
  referral_code?: string | null;
  academy_status: string;
  verified: boolean;
  phone?: string | null;
  calling_code?: string | null;
}
export interface Blocker {
  key: string;
  count: number;
  label: string;
  href: string;
}
export interface DeletionPreview {
  blockers: Blocker[];
  grace_days: number;
  bookings: number;
  services: number;
  reviews: number;
  subscriptions: number;
  pending: boolean;
}

export const listVendors = (p: { q?: string; state?: VendorState; subscription?: string; verified?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  if (p.state === "all") qs.set("state", "all");
  return api.get<VendorList>(`${B}?${qs}`);
};
export const getVendor = (id: number) => api.get<VendorDetail>(`${B}/${id}`);
export const createVendor = (b: VendorInput & { phone: string; calling_code: string; password?: string }) => api.post<{ id: number; temp_password: string | null }>(B, b);
export const updateVendor = (id: number, b: VendorInput) => api.put<{ id: number }>(`${B}/${id}`, b);
export const setVendorActive = (id: number, active: boolean) => api.post(`${B}/${id}/status`, { active });
export const vendorDeletionPreview = (id: number) => api.get<DeletionPreview>(`${B}/${id}/deletion-preview`);
export const deleteVendor = (id: number) => api.delete<{ id: number; anonymize_on: string }>(`${B}/${id}`);
export const restoreVendor = (id: number) => api.post(`${B}/${id}/restore`);
export const anonymizeVendor = (id: number, confirm: string) => api.post(`${B}/${id}/anonymize`, { confirm });

export const vendorServices = (id: number, lang: string) => api.get<{ total: number; active: number; limit: number; items: ServiceCard[] }>(`${B}/${id}/services?lang=${lang}`);
export const vendorServiceForm = (id: number, lang: string) => api.get<{ catalog: { categories: CatalogCategory[] }; locations: Locations }>(`${B}/${id}/service-form?lang=${lang}`);
export const vendorService = (id: number, sid: number, lang: string) => api.get<ServiceDetail>(`${B}/${id}/services/${sid}?lang=${lang}`);
export const createVendorService = (id: number, b: ServiceInput) => api.post<{ id: number }>(`${B}/${id}/services`, b);
export const updateVendorService = (id: number, sid: number, b: ServiceInput) => api.put<{ id: number }>(`${B}/${id}/services/${sid}`, b);
export const deleteVendorService = (id: number, sid: number) => api.delete(`${B}/${id}/services/${sid}`);
export const setVendorServiceActive = (id: number, sid: number, active: boolean) => api.patch(`${B}/${id}/services/${sid}/visibility`, { active });

export const activateVendorSubscription = (id: number, period: "monthly" | "yearly", amount?: number) => api.post<{ id: number; start: string; end: string }>(`${B}/${id}/subscription`, { period, amount });
export const deactivateVendorSubscription = (id: number) => api.post(`${B}/${id}/subscription/deactivate`);

export async function uploadVendorServiceImage(id: number, file: File): Promise<string> {
  const { uploadFor } = await import("./providerServices");
  return uploadFor(`${B}/${id}/service-images`, file);
}
