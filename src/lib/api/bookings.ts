import { api } from "./client";

export interface BookingUnit {
  unit_id: string;
  label: string | null;
  price: number;
}
export interface BookingOption {
  name: string;
  price: number;
}
export interface BookingService {
  id: number;
  title: string;
  description: string | null;
  units: BookingUnit[];
  options: BookingOption[];
}
export interface BookingOptions {
  vendor_id: number;
  name: string;
  city: string | null;
  services: BookingService[];
  /** Frais de mise en relation (selon la note du prestataire). */
  linking_amount: number;
  districts: { id: number; name: string }[];
  slots: { iso: string; label: string }[];
  payment: { cash: boolean; online: boolean };
  max_days_ahead: number;
}
export interface Price {
  service: number;
  options: number;
  linking: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon?: { code: string; type: string; value: string } | null;
}
export interface QuoteInput {
  ref: string;
  service_id: number;
  unit_id?: string | null;
  qty: number;
  options: string[];
  coupon?: string | null;
}
export interface BookingInput extends QuoteInput {
  date: string;
  time: string;
  name: string;
  phone: string;
  address: string;
  info?: string | null;
  district_id?: number | null;
  link?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  street_name?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  payment: "cash" | "online";
  /** Paiement en ligne : ce qui est regle maintenant (tout, mise en relation seule, service seul). */
  pay_mode?: PayMode;
}
/** Facture de paiement en ligne (SEMOA) : `bill_url` est la page de paiement (Mobile Money / carte). */
/** ALL = service + mise en relation ; PL = mise en relation seule ; BK = service seul. */
export type PayMode = "ALL" | "PL" | "BK";
export interface PaymentSummary {
  total: number;
  linking: number;
  service: number;
  paid: number;
  remaining: number;
  linking_paid: boolean;
  service_paid: boolean;
  status: "unpaid" | "partial" | "paid";
  /** Choix encore proposes (les parts deja reglees n'y figurent plus). */
  options: { mode: PayMode; amount: number }[];
}
export interface BookingInvoice {
  order_reference: string | null;
  bill_url: string;
  amount: number | null;
  currency: string | null;
}
export interface BookingCreated {
  id: number;
  ref: string;
  status: string;
  price: Price;
  payment: { method: string; invoice: BookingInvoice | null; invoice_error: string | null };
}
export interface MyBooking {
  id: number;
  ref: string;
  date: string | null;
  time: string;
  total: string;
  payment_method: string;
  paid: boolean;
  payment: PaymentSummary;
  info: string | null;
  client_name: string | null;
  client_phone: string | null;
  status: "pending" | "completed" | "cancelled";
  address: string;
  vendor_id: number;
  vendor_name: string | null;
  service: string | null;
  qty: string;
  created_at: string | null;
}

export const getBookingOptions = (ref: string) => api.get<BookingOptions>(`/bookings/options/${encodeURIComponent(ref)}`);
export const quoteBooking = (body: QuoteInput) => api.post<Price>("/bookings/quote", body);
export const createBooking = (body: BookingInput) => api.post<BookingCreated>("/bookings", body);
export const getBookingPayment = (id: number) =>
  api.get<{ id: number; ref: string; method: string; paid: boolean; payment: PaymentSummary; invoice: (BookingInvoice & { mode?: PayMode }) | null }>(`/bookings/${id}/payment`);
export const payBooking = (id: number, mode: PayMode = "ALL") => api.post<{ id: number; ref: string; invoice: BookingInvoice }>(`/bookings/${id}/pay`, { mode });
export interface EditBookingInput {
  date: string;
  time: string;
  name: string;
  phone: string;
  address: string;
  info: string | null;
}
export const editBooking = (id: number, body: EditBookingInput) => api.patch<{ id: number; ref: string; date: string; time: string; address: string }>(`/bookings/${id}`, body);
export const adminCreateBooking = (body: BookingInput & { client_id: number }) => api.post<BookingCreated>("/bookings/admin", body);
export const myBookings = () => api.get<MyBooking[]>("/bookings/mine");
export const cancelBooking = (id: number, reason?: string) => api.post<{ id: number; status: string }>(`/bookings/${id}/cancel`, { reason: reason ?? null });

// ---------- Administration : menu « Réservations »
export type AdminBookingStatus = "pending" | "completed" | "cancelled";
export interface AdminBooking {
  id: number;
  ref: string;
  created_at: string | null;
  date: string | null;
  time: string | null;
  status: AdminBookingStatus;
  paid: boolean;
  payment_method: string | null;
  client_id: number | null;
  client_name: string | null;
  client_phone: string | null;
  vendor_id: number | null;
  vendor_name: string | null;
  service: string | null;
  qty: number | null;
  total: number | string | null;
  country: string | null;
  city: string | null;
}
export interface AdminInvoice {
  id: number;
  reference: string | null;
  mode: PayMode | null;
  amount: number;
  created_at: string | null;
  bill_url: string | null;
  paid_amount: number;
  paid_at: string | null;
}
export interface AdminBookingDetail extends AdminBooking {
  payment: PaymentSummary;
  invoices: AdminInvoice[];
  client_email: string | null;
  vendor_phone: string | null;
  address: string | null;
  district: string | null;
  info: string | null;
  map_link: string | null;
  options: unknown[];
  coupon: string | null;
  total_before_discount: number | string | null;
  linking: number | string | null;
  cancellation_reason: string | null;
}
export interface AdminBookingList {
  total: number;
  page: number;
  page_size: number;
  counts: { pending: number; completed: number; cancelled: number; all: number };
  items: AdminBooking[];
}

export const adminListBookings = (p: { status?: string; q?: string; date_from?: string; date_to?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  return api.get<AdminBookingList>(`/bookings/admin?${qs}`);
};
export const adminBookingDetail = (id: number) => api.get<AdminBookingDetail>(`/bookings/admin/${id}`);
export const adminSetBookingStatus = (id: number, status: "completed" | "cancelled", reason?: string) =>
  api.post<{ id: number; status: string }>(`/bookings/admin/${id}/status`, { status, reason: reason || null });

export interface AdminBookingEdit {
  date?: string;
  time?: string;
  address?: string;
  info?: string;
  client_name?: string;
  client_phone?: string;
}
export const adminEditBooking = (id: number, body: AdminBookingEdit) => api.put<{ id: number }>(`/bookings/admin/${id}`, body);
export const adminDeleteBooking = (id: number) => api.delete(`/bookings/admin/${id}`);

// ---------- Administration : menu « Paiements »
export interface AdminPayment {
  id: number;
  reference: string | null;
  mode: PayMode | null;
  mode_label: string;
  amount: number;
  created_at: string | null;
  bill_url: string | null;
  paid_amount: number;
  paid_at: string | null;
  status: "paid" | "pending";
  booking_id: number;
  booking_ref: string;
  client_name: string | null;
  client_phone: string | null;
  vendor_name: string | null;
  service: string | null;
}
export interface AdminPaymentList {
  total: number;
  page: number;
  page_size: number;
  counts: { all: number; paid: number; pending: number };
  collected: number;
  awaiting: number;
  items: AdminPayment[];
}
export const adminListPayments = (p: { status?: string; mode?: string; q?: string; page?: number; page_size?: number }) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
  return api.get<AdminPaymentList>(`/payments/admin?${qs}`);
};
