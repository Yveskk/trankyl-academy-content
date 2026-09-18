import { api } from "./client";
import type { Apprenant, Client } from "./types";

interface Token {
  access_token: string;
  token_type: string;
}

export function register(payload: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone: string;
}) {
  return api.post<Apprenant>("/auth/register", payload);
}

export function login(phone: string, password: string) {
  return api.post<Token>("/auth/login", { phone, password });
}

export function me() {
  return api.get<Apprenant>("/auth/me");
}

export function adminLogin(email: string, password: string) {
  return api.post<Token>("/auth/admin/login", { email, password });
}

export function registerClient(payload: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone: string;
}) {
  return api.post<Client>("/auth/client/register", payload);
}

export function loginClient(phone: string, password: string) {
  return api.post<Token>("/auth/client/login", { phone, password });
}

export function meClient() {
  return api.get<Client>("/auth/client/me");
}

export type AuthRole = "apprenant" | "client" | "admin";

export function forgotPassword(email: string, role: AuthRole, channel: "email" | "sms" = "email") {
  return api.post<{ detail: string }>("/auth/forgot-password", { email, role, channel });
}

export function verifyOtp(email: string, role: AuthRole, code: string) {
  return api.post<{ reset_token: string }>("/auth/verify-otp", { email, role, code });
}

export function resetPassword(email: string, role: AuthRole, resetToken: string, newPassword: string) {
  return api.post<{ detail: string }>("/auth/reset-password", {
    email,
    role,
    reset_token: resetToken,
    new_password: newPassword,
  });
}
