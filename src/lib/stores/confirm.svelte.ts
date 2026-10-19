/**
 * Boite de confirmation personnalisee (remplace window.confirm).
 *
 *   const ok = await confirmDialog.ask({ title: "Supprimer ?", message: "…", tone: "danger" });
 *
 * Avec `action`, le bouton de confirmation affiche un indicateur de chargement
 * pendant l'execution et la boite ne se ferme qu'une fois terminee :
 *
 *   await confirmDialog.ask({ title: "…", confirmLabel: "Supprimer", tone: "danger", action: () => api.delete(...) });
 *
 * Resout `true` si confirme (et action reussie), `false` sinon. Si `action`
 * echoue, l'erreur est affichee dans un snackbar et la boite se ferme.
 */
import { snackbar } from "./snackbar.svelte";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  action?: () => Promise<unknown>;
};

class ConfirmStore {
  open = $state(false);
  loading = $state(false);
  options = $state<ConfirmOptions>({ title: "" });
  #resolve: ((value: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    // Une seule boite a la fois : une nouvelle demande annule la precedente.
    this.#resolve?.(false);
    this.options = options;
    this.loading = false;
    this.open = true;
    return new Promise<boolean>((resolve) => {
      this.#resolve = resolve;
    });
  }

  async confirm() {
    if (this.loading) return;
    const action = this.options.action;
    if (action) {
      this.loading = true;
      try {
        await action();
        this.#finish(true);
      } catch (e) {
        snackbar.error((e as Error).message || "L'action a échoué.");
        this.#finish(false);
      }
      return;
    }
    this.#finish(true);
  }

  cancel() {
    if (this.loading) return; // on n'interrompt pas une action en cours
    this.#finish(false);
  }

  #finish(value: boolean) {
    this.open = false;
    this.loading = false;
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.(value);
  }
}

export const confirmDialog = new ConfirmStore();
