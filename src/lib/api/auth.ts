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
  return api.post<Apprenant>("/auth/register", payload);
}

export function login(email: string, password: string) {
  return api.post<Token>("/auth/login", { email, password });
}

export function me() {
  return api.get<Apprenant>("/auth/me");
}

export function adminLogin(email: string, password: string) {
  return api.post<Token>("/auth/admin/login", { email, password });
}
