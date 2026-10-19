import { browser } from "$app/environment";

/** Cookies de preference (pays, langue) : lisibles par le serveur pour le rendu initial. */
export function readCookie(name: string): string | null {
  if (!browser) return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function writeCookie(name: string, value: string, days = 365): void {
  if (!browser) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; SameSite=Lax`;
}
