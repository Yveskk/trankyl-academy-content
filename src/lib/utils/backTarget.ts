/**
 * Page de repli du lien "Retour" : utilisee quand l'historique du navigateur
 * ne permet pas de revenir en arriere (arrivee directe sur la page, lien
 * partage, rechargement). Retourne null si la page n'a pas de retour logique
 * (accueil, connexion admin, tableau de bord admin).
 */
const EXACT: Record<string, string | null> = {
  "/": "/accueil",
  "/accueil": null,
  "/recherche": "/accueil",
  "/blog": "/accueil",
  "/impact": "/accueil",
  "/contact": "/accueil",
  "/dashboard": "/accueil",
  "/apprenant": "/accueil",
  "/login": "/accueil",
  "/register": "/devenir-prestataire",
  "/devenir-prestataire": null,
  "/prestataires": "/accueil",
  "/prestataires/liste": "/prestataires",
  "/messagerie": "/apprenant",
  "/client/login": "/accueil",
  "/client/register": "/accueil",
  "/client/messagerie": "/accueil",
  "/client/reservations": "/accueil",
  "/client/compte": "/accueil",
  "/client/compte/securite": "/client/compte",
  "/mot-de-passe-oublie": "/login",
  "/admin": null,
  "/admin/login": null,
  "/admin/dashboard": null,
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/profil\/([^/]+)\/reserver$/, (m) => `/profil/${m[1]}`],
  [/^\/profil\/[^/]+$/, () => "/recherche"],
  [/^\/blog\/[^/]+$/, () => "/blog"],
  [/^\/metiers\/[^/]+$/, () => "/"],
  [/^\/modules\/[^/]+$/, () => "/"],
  [/^\/dashboard\/.+$/, () => "/apprenant"],
  [/^\/prestataires\/[^/]+$/, () => "/prestataires/liste"],
  [/^\/admin\/taxonomy\/[^/]+$/, () => "/admin/taxonomy"],
  [/^\/admin\/enrolements\/[^/]+$/, () => "/admin/enrolements"],
  [/^\/admin\/nouvelle-reservation$/, () => "/admin/reservations"],
  [/^\/admin\/.+$/, () => "/admin/dashboard"],
];

export function backFallback(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path in EXACT) return EXACT[path];
  for (const [re, to] of PATTERNS) {
    const m = path.match(re);
    if (m) return to(m);
  }
  return "/accueil";
}
