import { api } from "./client";

export interface QuoteInput {
  vendor_id: number;
  message: string;
  slot_label?: string | null;
  /** Visiteur non connecte seulement : un client connecte est identifie par son compte. */
  name?: string;
  phone?: string;
  email?: string;
}

export type QuoteStatus = "new" | "answered";

export interface AdminQuote {
  id: number;
  vendor_id: number;
  vendor_name: string | null;
  client_id: number | null;
  name: string;
  phone: string | null;
  email: string;
  message: string;
  slot_label: string | null;
  lang: "fr" | "en";
  status: QuoteStatus;
  country: string;
  created_at: string | null;
  reply_subject: string | null;
  reply_message: string | null;
  replied_by: string | null;
  replied_at: string | null;
}

export interface AdminQuoteList {
  items: AdminQuote[];
  total: number;
  page: number;
  page_size: number;
  counts: { all: number; new: number; answered: number };
}

export const createQuote = (body: QuoteInput) => api.post<{ id: number; status: QuoteStatus }>("/quotes", body);

export const adminListQuotes = (p: { status?: string; q?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  return api.get<AdminQuoteList>(`/quotes/admin?${qs}`);
};

export const adminReplyQuote = (id: number, subject: string, message: string) => api.post<AdminQuote>(`/quotes/admin/${id}/reply`, { subject, message });
