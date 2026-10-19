import { AsyncLocalStorage } from "node:async_hooks";
import type { Handle } from "@sveltejs/kit";

/**
 * Pays et langue du visiteur pour TOUTE la duree du rendu serveur d'une requete.
 * Le client API (lib/api/client.ts) les lit ici pour envoyer X-Country / X-Lang, y compris sur un
 * rechargement complet de page (le serveur ne connait pas les stores du navigateur, seulement les cookies).
 * Un AsyncLocalStorage isole chaque requete : aucune fuite de pays entre deux visiteurs.
 */
const scope = new AsyncLocalStorage<{ country: string; lang: string }>();
(globalThis as Record<string, unknown>).__academyScope = scope;

export const handle: Handle = ({ event, resolve }) => {
  const country = event.cookies.get("academy_country");
  const locale = event.cookies.get("academy_locale");
  return scope.run({ country: country && /^[A-Z]{2}$/.test(country) ? country : "TG", lang: locale === "en" ? "en" : "fr" }, () => resolve(event));
};
