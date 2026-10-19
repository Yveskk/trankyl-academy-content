import { meClient } from "$lib/api/auth";
import type { Client } from "$lib/api/types";
import { auth } from "./auth.svelte";

/** Compte du client connecté, partagé entre les pages de « Mon compte » (nom, photo…). */
class ClientAccount {
  me = $state<Client | null>(null);
  loading = $state(false);

  async load(force = false) {
    if (this.me && !force) return this.me;
    this.loading = true;
    try {
      this.set(await meClient());
    } finally {
      this.loading = false;
    }
    return this.me;
  }

  set(c: Client) {
    this.me = c;
    // L'en-tête du site affiche le prénom et la photo.
    auth.setProfile({ firstname: c.firstname, lastname: c.lastname, image: c.image });
  }

  clear() {
    this.me = null;
  }
}

export const clientAccount = new ClientAccount();
