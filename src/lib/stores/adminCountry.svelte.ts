import { browser } from "$app/environment";

/**
 * Pays dans lequel l'administrateur travaille. Distinct du pays que voit un visiteur : un administrateur
 * peut gerer la Cote d'Ivoire en consultant le site du Togo. Toute requete du panneau part avec ce pays.
 * Le choix est memorise PAR COMPTE : sur un navigateur partage, le pays d'un collegue ne s'applique pas.
 */
const KEY = "academy_admin_country";

class AdminCountryStore {
  code = $state<string | null>(null);
  #userId: number | null = null;

  #read(userId: number): string | null {
    if (!browser) return null;
    try {
      return localStorage.getItem(`${KEY}:${userId}`);
    } catch {
      return null;
    }
  }

  set(code: string) {
    this.code = code;
    if (browser && this.#userId !== null) {
      try {
        localStorage.setItem(`${KEY}:${this.#userId}`, code);
      } catch {
        // navigation privee : le choix reste en memoire
      }
    }
  }

  /** Retient le pays memorise de CE compte s'il est encore autorise, sinon le pays par defaut / le premier autorise. */
  ensure(userId: number, allowed: string[], fallback: string | null) {
    this.#userId = userId;
    const stored = this.#read(userId);
    if (stored && allowed.includes(stored)) {
      this.code = stored;
      return;
    }
    const next = fallback && allowed.includes(fallback) ? fallback : (allowed[0] ?? null);
    if (next) this.set(next);
    else this.code = null;
  }
}

export const adminCountry = new AdminCountryStore();
