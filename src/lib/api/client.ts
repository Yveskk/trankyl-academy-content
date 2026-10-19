import { PUBLIC_API_URL } from "$env/static/public";
import { browser } from "$app/environment";
import { adminCountry } from "$lib/stores/adminCountry.svelte";
import { auth } from "$lib/stores/auth.svelte";
import { i18n } from "$lib/stores/locale.svelte";
import { site } from "$lib/stores/site.svelte";
import { apiLoading } from "$lib/stores/loading.svelte";

export class ApiError extends Error {
  status: number;
  /** Corps structure de l'erreur (ex. {message, code, attempts_left, channels, request_id}) quand l'API en renvoie un. */
  data: Record<string, any> | null;
  constructor(status: number, message: string, data: Record<string, any> | null = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Pays et langue de la requete, envoyes sur TOUS les appels : aucun endpoint n'a a les recevoir en parametre.
 * Dans le panneau d'administration c'est le pays de travail de l'administrateur, ailleurs celui du visiteur.
 */
export function scopeHeaders(): Record<string, string> {
  if (!browser) {
    // Rendu serveur : pays / langue des cookies de la requete en cours (voir hooks.server.ts).
    const ctx = (globalThis as { __academyScope?: { getStore(): { country: string; lang: string } | undefined } }).__academyScope?.getStore();
    return ctx ? { "X-Country": ctx.country, "X-Lang": ctx.lang } : {};
  }
  const inAdmin = auth.role === "admin" && window.location.pathname.startsWith("/admin");
  return { "X-Country": (inAdmin && adminCountry.code) || site.country, "X-Lang": i18n.locale };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  apiLoading.start();
  try {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    for (const [k, v] of Object.entries(scopeHeaders())) headers.set(k, v);
    if (auth.token) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    }

    const res = await fetch(`${PUBLIC_API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      let detail: unknown = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
        // reponse sans corps JSON exploitable
      }
      if (detail && typeof detail === "object" && !Array.isArray(detail) && "message" in detail) {
        const d = detail as Record<string, any>;
        throw new ApiError(res.status, String(d.message), d);
      }
      // Erreurs de validation FastAPI (422) : on affiche le premier message lisible.
      if (Array.isArray(detail)) {
        const first = detail[0] as { msg?: string } | undefined;
        throw new ApiError(res.status, first?.msg?.replace(/^Value error, /, "") ?? res.statusText);
      }
      // Session admin expiree / compte suspendu / mot de passe change ailleurs : retour a la connexion.
      if (res.status === 401 && auth.role === "admin" && typeof detail === "string" && detail.startsWith("Identifiants invalides")) {
        auth.logout();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) window.location.assign("/admin/login?expired=1");
      }
      throw new ApiError(res.status, String(detail));
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  } finally {
    apiLoading.stop();
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
