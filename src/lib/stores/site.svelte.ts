import { browser } from "$app/environment";
import { readCookie, writeCookie } from "$lib/utils/cookies";

/**
 * Pays actif du site (TG, BJ, CI...). Partage entre la bande verte (qui le
 * choisit) et toutes les pages : chaque requete a l'API part avec ce pays
 * (en-tete X-Country). Memorise dans un cookie (lu aussi par le serveur pour
 * le rendu initial) et dans localStorage.
 */
export const COUNTRY_COOKIE = "academy_country";
const STORAGE_KEY = "academy_country";
export const DEFAULT_COUNTRY = "TG";

export const isCountryCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{2}$/.test(v);

function readStored(): string {
  if (!browser) return DEFAULT_COUNTRY;
  const fromCookie = readCookie(COUNTRY_COOKIE);
  if (isCountryCode(fromCookie)) return fromCookie;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isCountryCode(v)) return v;
  } catch {
    // stockage indisponible
  }
  return DEFAULT_COUNTRY;
}

class SiteStore {
  country = $state<string>(readStored());

  setCountry(code: string) {
    if (!isCountryCode(code)) return;
    this.country = code;
    if (browser) {
      writeCookie(COUNTRY_COOKIE, code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // navigation privee : on garde la valeur en memoire
      }
    }
  }
}

export const site = new SiteStore();
