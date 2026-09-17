/**
 * Compteur global de requetes API en cours (incremente/decremente depuis
 * $lib/api/client.ts, qui est le point de passage unique de tous les appels
 * GET/POST/PUT/PATCH/DELETE de l'application). Permet d'afficher un loader
 * global des qu'une requete est en vol, sans avoir a le gerer manuellement
 * page par page.
 */
class LoadingStore {
  activeRequests = $state(0);

  get isLoading() {
    return this.activeRequests > 0;
  }

  start() {
    this.activeRequests += 1;
  }

  stop() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }
}

export const apiLoading = new LoadingStore();
