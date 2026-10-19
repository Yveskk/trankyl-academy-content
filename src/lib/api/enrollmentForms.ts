import { api } from "./client";

export type FormStatus = "pending" | "approved" | "rejected";
export interface FormRow {
  id: number;
  vendor_id: number;
  status: FormStatus;
  study_level: string | null;
  company: string | null;
  updated_at: string | null;
  created_at: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  image: string | null;
  city: string | null;
  signature_pending: boolean;
}
export interface FormList {
  total: number;
  page: number;
  page_size: number;
  counts: { pending: number; approved: number; rejected: number; all: number };
  items: FormRow[];
}
export interface FormField {
  key: string;
  label: string;
  kind: "text" | "file" | "files";
  value: string | string[] | null;
  filled: boolean;
  /** Facultatif : vide, il ne compte pas comme manquant. */
  optional?: boolean;
}
export interface FormDetail {
  id: number;
  vendor_id: number;
  status: FormStatus;
  admin_note: string | null;
  vendor: { name: string; phone: string | null; email: string | null; city: string | null; address: string | null; image: string | null };
  groups: { title: string; fields: FormField[] }[];
  signature: string | null;
  signature_pending: string | null;
  signature_reason: string | null;
  contract_pdf: string | null;
  id_number: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const listForms = (p: { status?: string; q?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  return api.get<FormList>(`/enrollment-forms/admin?${qs}`);
};
export const getForm = (id: number) => api.get<FormDetail>(`/enrollment-forms/admin/${id}`);
export const decideForm = (id: number, status: "approved" | "rejected", note: string, fields: string[]) =>
  api.post<{ id: number; status: string }>(`/enrollment-forms/admin/${id}/decision`, { status, note: note || null, fields });
export const decideSignature = (id: number, approve: boolean, reason?: string) =>
  api.post<{ id: number }>(`/enrollment-forms/admin/${id}/signature`, { approve, reason: reason || null });
