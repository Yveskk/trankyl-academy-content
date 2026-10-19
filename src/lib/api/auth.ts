import { getDeviceToken } from "$lib/utils/device";
import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { ApiError, api, scopeHeaders } from "./client";
import type { Apprenant, Client } from "./types";

export type Channel = "whatsapp" | "sms" | "email";
export type AuthRole = "apprenant" | "client" | "admin";

/** Reponse d'une connexion / inscription : un jeton, ou un code a saisir. */
export interface AuthResult {
  status: "ok" | "verification_required" | "change_password_required" | "mfa_setup_required" | "mfa_required";
  access_token?: string | null;
  token_type?: string;
  role?: string | null;
  device_token?: string | null;
  request_id?: string | null;
  channel?: Channel | null;
  destination_masked?: string | null;
  expires_in?: number | null;
  resend_in?: number | null;
  channels: Channel[];
  /** Connexion admin : jeton d'etape (mot de passe temporaire / 2FA). */
  pre_token?: string | null;
  recovery_codes?: string[] | null;
  recovery_left?: number | null;
}

export interface AdminMe {
  id: number;
  firstname: string;
  lastname: string | null;
  email: string;
  role: { id: number; name: string } | null;
  is_super: boolean;
  permissions: string[];
  mfa_enabled: boolean;
  recovery_left: number;
  all_countries: boolean;
  countries: { code: string; name: string; name_en: string | null }[];
  default_country: string | null;
}

export interface MfaSetup {
  secret: string;
  otpauth_uri: string;
  issuer: string;
  account: string;
  digits: number;
  period: number;
}

export interface SignupPayload {
  role: "apprenant" | "client" | "prestataire";
  /** Prenoms (le nom de famille est facultatif). */
  firstname: string;
  lastname?: string;
  /** Facultatif pour un apprenant / prestataire, obligatoire pour un client. */
  email?: string | null;
  password: string;
  phone: string;
  channel?: Channel;
  lang?: "fr" | "en";
  /** Anti-robots : champ piege (doit rester vide) et duree passee sur le formulaire. */
  hp?: string;
  elapsed_ms?: number;
  /** Prestataire : facultatifs, a completer plus tard depuis son profil. */
  subcategory_id?: number | null;
  city?: string;
  years_experience?: number | null;
}

/** Ecran 1 -> 2 : informations valides, voici comment recevoir le code (rien n'est encore envoye). */
export interface SignupChecked {
  ok: boolean;
  channels: Channel[];
  recommended: Channel;
  /** canal -> destination masquee */
  destinations: Record<string, string>;
}

// ---------------------------------------------------------------- inscription (verifiee)
export const signupCheck = (payload: SignupPayload) => api.post<SignupChecked>("/auth/signup/check", payload);

export const signupStart = (payload: SignupPayload) => api.post<AuthResult>("/auth/signup/start", payload);

export const signupVerify = (requestId: string, code: string, trustDevice = false) =>
  api.post<AuthResult>("/auth/signup/verify", { request_id: requestId, code, trust_device: trustDevice });

// ---------------------------------------------------------------- connexion
export const login = (phone: string, password: string, opts: { channel?: Channel; lang?: "fr" | "en" } = {}) =>
  api.post<AuthResult>("/auth/login", { phone, password, device_token: getDeviceToken("apprenant"), ...opts });

export const loginClient = (phone: string, password: string, opts: { channel?: Channel; lang?: "fr" | "en" } = {}) =>
  api.post<AuthResult>("/auth/client/login", { phone, password, device_token: getDeviceToken("client"), ...opts });

export const adminLogin = (email: string, password: string, lang: "fr" | "en" = "fr") =>
  api.post<AuthResult>("/auth/admin/login", { email, password, lang });

// ---------------------------------------------------------------- administration : mot de passe temporaire + 2FA
export const adminChangeTempPassword = (preToken: string, newPassword: string) =>
  api.post<AuthResult>("/auth/admin/password/change", { pre_token: preToken, new_password: newPassword });
export const adminMfaSetup = (preToken: string) => api.post<MfaSetup>("/auth/admin/mfa/setup", { pre_token: preToken });
export const adminMfaEnable = (preToken: string, code: string) => api.post<AuthResult>("/auth/admin/mfa/enable", { pre_token: preToken, code });
export const adminMfaVerify = (preToken: string, input: { code?: string; recovery_code?: string }) =>
  api.post<AuthResult>("/auth/admin/mfa/verify", { pre_token: preToken, ...input });
export const adminMe = () => api.get<AdminMe>("/auth/admin/me");
export const adminChangePassword = (currentPassword: string, newPassword: string, code: string) =>
  api.post<{ detail: string; access_token: string }>("/auth/admin/me/password", { current_password: currentPassword, new_password: newPassword, code });
export const adminRegenerateRecoveryCodes = (code: string) => api.post<{ recovery_codes: string[] }>("/auth/admin/me/recovery-codes", { code });

export const loginVerify = (requestId: string, code: string, trustDevice = false) =>
  api.post<AuthResult>("/auth/login/verify", { request_id: requestId, code, trust_device: trustDevice });

export const resendCode = (requestId: string, channel?: Channel) =>
  api.post<AuthResult>("/auth/verification/resend", { request_id: requestId, channel });

export const me = () => api.get<Apprenant>("/auth/me");
export const meClient = () => api.get<Client>("/auth/client/me");

// ---------------------------------------------------------------- mot de passe oublie
export const forgotPassword = (identifier: string, role: AuthRole, channel: Channel = "email", lang: "fr" | "en" = "fr") =>
  api.post<AuthResult>("/auth/forgot-password", { identifier, role, channel, lang });

export const verifyResetCode = (requestId: string, code: string) =>
  api.post<{ reset_token: string }>("/auth/verify-otp", { request_id: requestId, code });

export const resetPassword = (resetToken: string, newPassword: string) =>
  api.post<{ detail: string }>("/auth/reset-password", { reset_token: resetToken, new_password: newPassword });

// ---------- « Mon compte » du client
export interface ClientProfileUpdate {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  /** Exigé pour changer l'e-mail ou le téléphone. */
  current_password?: string;
}
export interface AccountActivity {
  event: string;
  label: string;
  success: boolean;
  ip: string | null;
  at: string | null;
}
export const updateClientProfile = (payload: ClientProfileUpdate) => api.patch<Client>("/auth/client/me", payload);
export const changeClientPassword = (currentPassword: string, newPassword: string) =>
  api.post<{ ok: boolean }>("/auth/client/me/password", { current_password: currentPassword, new_password: newPassword });
export const clientActivity = () => api.get<AccountActivity[]>("/auth/client/me/activity");
export const revokeClientDevices = () => api.post<{ ok: boolean }>("/auth/client/me/devices/revoke");
export const closeClientAccount = (password: string) => api.post<{ ok: boolean }>("/auth/client/me/close", { password });

export async function uploadClientPhoto(file: File): Promise<Client> {
  const body = new FormData();
  body.append("file", file);
  const headers = new Headers(scopeHeaders());
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
  const res = await fetch(`${PUBLIC_API_URL}/auth/client/me/photo`, { method: "POST", headers, body });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const d = (await res.json()).detail;
      detail = Array.isArray(d) ? (d[0]?.msg ?? detail) : (d ?? detail);
    } catch {
      // pas de corps JSON
    }
    throw new ApiError(res.status, String(detail));
  }
  return res.json();
}
export const removeClientPhoto = () => api.delete<Client>("/auth/client/me/photo");
