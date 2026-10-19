import { browser } from "$app/environment";
import { readCookie, writeCookie } from "$lib/utils/cookies";
import { fr } from "$lib/i18n/fr";
import { en } from "$lib/i18n/en";

export type Locale = "fr" | "en";

const dictionaries = { fr, en };
const STORAGE_KEY = "academy_locale";
export const LOCALE_COOKIE = "academy_locale";

function detectLocale(): Locale {
  if (!browser) return "fr";
  const cookie = readCookie(LOCALE_COOKIE);
  if (cookie === "fr" || cookie === "en") return cookie;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang === "en") return "en";
  return "fr";
}

class LocaleStore {
  locale = $state<Locale>(detectLocale());

  get dict() {
    return dictionaries[this.locale];
  }

  set(locale: Locale) {
    this.locale = locale;
    if (browser) {
      localStorage.setItem(STORAGE_KEY, locale);
      writeCookie(LOCALE_COOKIE, locale);
    }
  }
}

export const i18n = new LocaleStore();
