import { api } from "./client";

export interface ResOption {
  value: string;
  label: string;
}
export interface ResField {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "select" | "switch" | "image" | "password" | "email" | "tel";
  required: boolean;
  options: ResOption[];
  lookup: string | null;
  default: unknown;
  help: string | null;
  create_only: boolean;
  max: number | null;
  on: unknown;
  off: unknown;
  upper: boolean;
}
export interface ResColumn {
  key: string;
  label: string;
  kind: "text" | "code" | "badge" | "bool" | "date" | "money" | "image" | "lookup";
  lookup: boolean;
  options: ResOption[];
  width: string | null;
}
export interface ResFilter {
  key: string;
  label: string;
  options: ResOption[];
  lookup: string | null;
}
export interface ResMeta {
  key: string;
  title: string;
  singular: string;
  description: string;
  pk: string;
  fields: ResField[];
  columns: ResColumn[];
  filters: ResFilter[];
  search: boolean;
  has_created: boolean;
  created_col: string | null;
  can: { create: boolean; update: boolean; delete: boolean; actions: boolean };
  actions: { key: string; label: string; tone: "default" | "danger"; confirm: string | null }[];
}
export type ResRow = Record<string, any> & { _id: number | string; _actions: string[]; _can_delete: boolean };
export interface ResList {
  items: ResRow[];
  total: number;
  page: number;
  page_size: number;
}

const B = "/admin-resources";
export const resMeta = (key: string) => api.get<ResMeta>(`${B}/${key}/meta`);
export const resList = (key: string, p: { q?: string; page?: number; page_size?: number; filters?: Record<string, string> }) => {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  qs.set("page", String(p.page ?? 1));
  qs.set("page_size", String(p.page_size ?? 20));
  for (const [k, v] of Object.entries(p.filters ?? {})) if (v) qs.set(`f_${k}`, v);
  return api.get<ResList>(`${B}/${key}?${qs}`);
};
export const resOptions = (key: string, q = "") => api.get<ResOption[]>(`${B}/${key}/options${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const resCreate = (key: string, body: Record<string, unknown>) => api.post<{ ok: boolean; id?: number }>(`${B}/${key}`, body);
export const resUpdate = (key: string, id: number | string, body: Record<string, unknown>) => api.put<{ ok: boolean }>(`${B}/${key}/${id}`, body);
export const resDelete = (key: string, id: number | string) => api.delete<{ ok: boolean }>(`${B}/${key}/${id}`);
export const resAction = (key: string, id: number | string, action: string) => api.post<{ ok: boolean; message: string }>(`${B}/${key}/${id}/actions/${action}`, {});
export const referralUsers = (id: number | string) =>
  api.get<{ client_id: number; client_unique_id: string; client_name: string; client_family_name: string | null; client_email: string; client_phone: string }[]>(`${B}/referrals/${id}/users`);

// Tarifs d'abonnement des prestataires
export interface SubscriptionPricing {
  monthly_amount: number;
  yearly_amount: number;
  configured: boolean;
}
export const getSubscriptionPricing = () => api.get<SubscriptionPricing>("/admin-settings/subscription");
export const saveSubscriptionPricing = (body: { monthly_amount: number; yearly_amount: number }) => api.put<SubscriptionPricing>("/admin-settings/subscription", body);
