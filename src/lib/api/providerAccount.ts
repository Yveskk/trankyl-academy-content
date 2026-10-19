import { api } from "./client";

const B = "/provider-space";

export interface SubscriptionRow {
  id: number;
  period: "monthly" | "yearly";
  amount: number;
  start: string | null;
  end: string | null;
  status: "active" | "expired" | "paid" | "pending";
  paid: number;
  paid_at: string | null;
  created_at: string | null;
  pay_url: string | null;
}
export interface SubscriptionPayment {
  reference: string | null;
  amount: number;
  date: string | null;
  invoice: string | null;
  invoice_url: string | null;
  currency: string;
  subscription_id: number;
  period: "monthly" | "yearly";
  covers_from: string | null;
  covers_to: string | null;
}
export interface SubscriptionState {
  pricing: { monthly: number; yearly: number };
  currency: string;
  online_payment: boolean;
  current: SubscriptionRow | null;
  days_left: number;
  history: SubscriptionRow[];
  payments: SubscriptionPayment[];
  paid_total: number;
}
export interface Notice {
  id: number;
  title: string;
  body: string;
  date: string | null;
  personal: boolean;
  data: Record<string, unknown> | null;
}
export interface Support {
  available: boolean;
  name?: string;
  country?: string;
  city?: string;
  phones?: string[];
  whatsapp?: string | null;
  address?: string | null;
  map?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  email?: string | null;
}

export const getSubscription = () => api.get<SubscriptionState>(`${B}/subscription`);
export const startSubscription = (period: "monthly" | "yearly") => api.post<{ subscription_id: number; amount: number; pay_url: string }>(`${B}/subscription/init`, { period });
export const getNotices = (limit = 50) => api.get<{ items: Notice[]; latest_id: number }>(`${B}/notifications?limit=${limit}`);
export const getShare = () => api.get<{ path: string; name: string; photo: string | null; verified: boolean }>(`${B}/share`);
export const getSupport = () => api.get<Support>(`${B}/support`);
export interface DeletionInfo {
  grace_days: number;
  blockers: { key: string; count: number; label: string; href: string }[];
  active_subscription_until: string | null;
}
export const getDeletionInfo = () => api.get<DeletionInfo>(`${B}/account/deletion`);
export const deleteMyAccount = (password: string) => api.post<{ scheduled: boolean; anonymize_on: string; grace_days: number }>(`${B}/account/delete`, { password });
