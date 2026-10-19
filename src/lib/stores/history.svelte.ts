/**
 * Suit si la navigation a un historique INTERNE au site : tant que le
 * visiteur n'a navigue vers aucune page (arrivee directe, lien partage), un
 * `history.back()` le sortirait du site ; le lien "Retour" utilise alors la
 * page de repli.
 */
class NavHistory {
  /** Nombre de navigations internes encore "en arriere" disponibles. */
  depth = $state(0);

  get canGoBack(): boolean {
    return this.depth > 0;
  }

  /** A appeler depuis afterNavigate() du layout racine. */
  record(type: string | null | undefined) {
    if (type === "enter") return; // premier chargement de la page
    if (type === "popstate") this.depth = Math.max(0, this.depth - 1); // bouton retour du navigateur (approximation)
    else this.depth += 1; // lien, goto, formulaire...
  }
}

export const navHistory = new NavHistory();
