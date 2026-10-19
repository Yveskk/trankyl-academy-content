import { api } from "./client";

export interface Ops {
  kpis: {
    bookingsTotal: number; bookingsThisMonth: number; bookingsToday: number; revenueTotal: number; revenueThisMonth: number; clientsTotal: number; clientsActiveThisMonth: number;
    vendorsTotal: number; vendorsActive: number; vendorsWithSubscription: number; vendorsThisMonth: number; subscriptionsActive: number; servicesTotal: number; servicesActive: number;
    contactRequestsPending: number; avgRating: number | null; reviewsTotal: number;
  };
  charts: {
    revenueByMonth: { month: string; amount: number; count: number }[];
    bookingsByStatus: { key: string; label: string; count: number }[];
    bookingsByCategory: { label: string; count: number }[];
    bookingsByPaymentStatus: { label: string; count: number }[];
    bookingsByPaymentMethod: { label: string; count: number }[];
  };
  topVendors: { id: number; name: string; missions: number; revenue: number }[];
  recentBookings: { id: number; ref: string; client: string | null; vendor: string | null; service: string | null; status: "pending" | "completed" | "cancelled"; created_at: string | null; amount: number }[];
  recentContactRequests: { id: number; client: string | null; vendor: string | null; status: string; created_at: string | null }[];
}
export const adminOperations = () => api.get<Ops>("/admin-dashboard/operations");
