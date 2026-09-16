import { browser } from "$app/environment";
import { fr } from "$lib/i18n/fr";
import { en } from "$lib/i18n/en";
import { es } from "$lib/i18n/es";

export type Locale = "fr" | "en" | "es";

const dictionaries = { fr, en, es };
const STORAGE_KEY = "academy_locale";

function detectLocale(): Locale {
  if (!browser) return "fr";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en" || stored === "es") return stored;
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang === "en") return "en";
  if (browserLang === "es") return "es";
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
    }
  }
}

export const i18n = new LocaleStore();
