import { api } from "./client";

export type Country = {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  marketplace_country_id: number | null;
  marketplace_country_name: string | null;
  calling_code: string | null;
  currency_code: string | null;
  payment_text: string | null;
  payment_text_en: string | null;
  help_url: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

export type CountryInput = Omit<Country, "id" | "marketplace_country_name" | "sort_order"> & { sort_order?: number | null };

export type MarketplaceCountry = { id: number; name: string; code: string; calling_code: string | null; has_service: boolean };

export const adminListCountries = () => api.get<Country[]>("/config/countries");
export const adminCreateCountry = (body: CountryInput) => api.post<Country>("/config/countries", body);
export const adminUpdateCountry = (id: number, body: CountryInput) => api.put<Country>(`/config/countries/${id}`, body);
export const adminDeleteCountry = (id: number) => api.delete(`/config/countries/${id}`);
export const adminReorderCountries = (ids: number[]) => api.post<{ ok: boolean }>("/config/countries/reorder", { ids });
export const adminInitializeCountries = () => api.post<Country[]>("/config/countries/initialize");
export const adminMarketplaceCountries = (q = "") => api.get<MarketplaceCountry[]>(`/config/countries/marketplace?q=${encodeURIComponent(q)}`);
