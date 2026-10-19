import { browser } from "$app/environment";
import { getNotices } from "$lib/api/providerAccount";
import { getOnboarding, type Onboarding } from "$lib/api/providerSpace";

/** Avancement du prestataire (profil -> enrôlement -> tableau de bord), partagé par toutes les pages de son espace. */
class ProviderSpace {
  state = $state<Onboarding | null>(null);
  loading = $state(false);
  forbidden = $state(false);
  /** Nombre de demandes en attente (badge du menu), renseigné par le tableau de bord. */
  newRequests = $state(0);
  /** Notifications non lues (badge du menu). Le « lu » est memorise dans ce navigateur : la table `notifications` est partagee et n'a pas de colonne de lecture. */
  unreadNotices = $state(0);
  #latest = 0;

  async refreshNotices() {
    if (!browser) return;
    try {
      const r = await getNotices(50);
      this.#latest = r.latest_id;
      const seen = Number(localStorage.getItem("ps_notice_seen") || 0);
      this.unreadNotices = r.items.filter((n) => n.id > seen).length;
    } catch {
      // le badge est facultatif
    }
  }

  markNoticesSeen(latestId: number) {
    this.#latest = Math.max(this.#latest, latestId);
    try {
      localStorage.setItem("ps_notice_seen", String(this.#latest));
    } catch {
      // stockage indisponible
    }
    this.unreadNotices = 0;
  }

  async load(force = false): Promise<Onboarding | null> {
    if (this.state && !force) return this.state;
    this.loading = true;
    try {
      this.state = await getOnboarding();
      this.forbidden = false;
    } catch (e) {
      if ((e as { status?: number }).status === 403) this.forbidden = true;
      else throw e;
    } finally {
      this.loading = false;
    }
    return this.state;
  }

  set(s: Onboarding) {
    this.state = s;
  }

  clear() {
    this.state = null;
    this.forbidden = false;
  }

  get unlocked() {
    return !!this.state?.dashboard_unlocked;
  }
}

export const providerSpace = new ProviderSpace();
