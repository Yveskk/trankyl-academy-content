/** Menus du panneau admin et permission qui donne acces a chacun (cles `academy.<menu>.view`). */
export interface AdminRoute {
  href: string;
  label: string;
  /** Une seule suffit (OU). */
  perm: string[];
  /** Section du menu lateral. */
  group: string;
  /** Lien externe (nouvel onglet) : jamais soumis a une permission de page. */
  external?: boolean;
}

/** Ordre des sections du menu lateral. */
export const ADMIN_GROUPS = ["Pilotage", "Exploitation", "Académie", "Catalogue", "Géographie", "Communication", "Paramètres", "Liens"];

export const ADMIN_ROUTES: AdminRoute[] = [
  { href: "/admin/dashboard", label: "Tableau de bord", perm: ["academy.dashboard.view"], group: "Pilotage" },

  { href: "/admin/reservations", label: "Réservations", perm: ["academy.bookings.view"], group: "Exploitation" },
  { href: "/admin/nouvelle-reservation", label: "Nouvelle réservation", perm: ["academy.bookings.manage"], group: "Exploitation" },
  { href: "/admin/demandes", label: "Demandes de réservation", perm: ["academy.requests.view"], group: "Exploitation" },
  { href: "/admin/paiements", label: "Paiements", perm: ["academy.payments.view"], group: "Exploitation" },
  { href: "/admin/devis", label: "Devis", perm: ["academy.quotes.view"], group: "Exploitation" },
  { href: "/admin/contacts", label: "Mises en relation", perm: ["academy.contacts.view"], group: "Exploitation" },
  { href: "/admin/clients", label: "Clients", perm: ["academy.clients.view"], group: "Exploitation" },
  { href: "/admin/prestataires", label: "Prestataires", perm: ["academy.providers.view"], group: "Exploitation" },
  { href: "/admin/enrolements", label: "Formulaires d'enrôlement", perm: ["academy.enrollment_forms.view"], group: "Exploitation" },
  { href: "/admin/suppressions", label: "Suppressions de compte", perm: ["academy.deletions.view"], group: "Exploitation" },

  { href: "/admin/taxonomy", label: "Taxonomie", perm: ["academy.taxonomy.view"], group: "Académie" },
  { href: "/admin/curriculum", label: "Curriculum", perm: ["academy.curriculum.view"], group: "Académie" },
  { href: "/admin/apprenants", label: "Apprenants", perm: ["academy.learners.view"], group: "Académie" },
  { href: "/admin/inscriptions", label: "Inscriptions", perm: ["academy.enrollments.view"], group: "Académie" },

  { href: "/admin/categories", label: "Catégories", perm: ["academy.catalog.view"], group: "Catalogue" },
  { href: "/admin/sous-categories", label: "Sous-catégories", perm: ["academy.catalog.view"], group: "Catalogue" },
  { href: "/admin/unites", label: "Unités", perm: ["academy.catalog.view"], group: "Catalogue" },
  { href: "/admin/coupons", label: "Coupons", perm: ["academy.coupons.view"], group: "Catalogue" },
  { href: "/admin/abonnement", label: "Abonnement", perm: ["academy.subscription.view"], group: "Catalogue" },
  { href: "/admin/parrainage", label: "Code parrainage", perm: ["academy.referrals.view"], group: "Catalogue" },

  { href: "/admin/pays", label: "Pays", perm: ["academy.geo.view"], group: "Géographie" },
  { href: "/admin/villes", label: "Villes", perm: ["academy.geo.view"], group: "Géographie" },
  { href: "/admin/quartiers", label: "Quartiers", perm: ["academy.geo.view"], group: "Géographie" },

  { href: "/admin/notifications", label: "Notifications", perm: ["academy.notifications.view"], group: "Communication" },
  { href: "/admin/blog", label: "Blog", perm: ["academy.blog.view"], group: "Communication" },
  { href: "/admin/accueil", label: "Page d'accueil", perm: ["academy.home.view"], group: "Communication" },
  { href: "/admin/avis", label: "Avis", perm: ["academy.reviews.view"], group: "Communication" },
  { href: "/admin/affiches", label: "Bannière", perm: ["academy.posters.view"], group: "Communication" },
  { href: "/admin/contenu", label: "Contenu du site", perm: ["academy.content.view"], group: "Communication" },

  { href: "/admin/configuration", label: "Configuration", perm: ["academy.config.view"], group: "Paramètres" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", perm: ["academy.users.view", "academy.roles.view"], group: "Paramètres" },

  { href: "https://contrats.trankyl.com/connexion", label: "Contrat Trankyl", perm: [], group: "Liens", external: true },
];

/** Permissions exigees par une URL (null = ouverte a tout administrateur connecte, ex. /admin/mon-compte). */
export function requiredFor(pathname: string): string[] | null {
  const route = ADMIN_ROUTES.filter((r) => !r.external)
    .sort((a, b) => b.href.length - a.href.length)
    .find((r) => pathname === r.href || pathname.startsWith(r.href + "/"));
  return route ? route.perm : null;
}

export function firstAllowedPath(can: (perm: string) => boolean): string {
  const r = ADMIN_ROUTES.find((x) => !x.external && x.perm.some(can));
  return r ? r.href : "/admin/mon-compte";
}
