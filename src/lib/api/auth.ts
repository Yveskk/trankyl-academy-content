import { USE_MOCK_DATA } from "$lib/config";
import * as mock from "$lib/mock/data";
import { api } from "./client";
import type { Apprenant } from "./types";

interface Token {
  access_token: string;
  token_type: string;
}

export function register(payload: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
}) {
  if (USE_MOCK_DATA) return mock.mockRegister(payload);
  return api.post<Apprenant>("/auth/register", payload);
}

export function login(email: string, password: string) {
  if (USE_MOCK_DATA) return mock.mockLogin();
  return api.post<Token>("/auth/login", { email, password });
}

export function me() {
  if (USE_MOCK_DATA) return mock.mockMe();
  return api.get<Apprenant>("/auth/me");
}

export function adminLogin(email: string, password: string) {
  if (USE_MOCK_DATA) return mock.mockAdminLogin();
  return api.post<Token>("/auth/admin/login", { email, password });
}
