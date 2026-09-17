import { browser } from "$app/environment";
import { unreadCount } from "$lib/api/matching";
import { unreadContactMessageCount } from "$lib/api/contactRequests";
import { snackbar } from "$lib/stores/snackbar.svelte";

export type NotifiableRole = "apprenant" | "client";

function browserNotificationsSupported(): boolean {
  return browser && typeof Notification !== "undefined";
}

class NotificationStore {
  count = $state(0);
  // "unsupported" si le navigateur n'implemente pas l'API Notification (ex:
  // certains navigateurs mobiles). Sinon reflete Notification.permission.
  permission = $state<NotificationPermission | "unsupported">(
    browserNotificationsSupported() ? Notification.permission : "unsupported"
  );
  private interval: ReturnType<typeof setInterval> | null = null;
  private role: NotifiableRole | null = null;
  private knownCount: number | null = null;

  /** A appeler depuis un vrai clic utilisateur (bouton "Activer les
   * notifications") : les navigateurs exigent un geste utilisateur pour
   * afficher la demande de permission, on ne l'appelle donc jamais tout
   * seul au chargement de la page. */
  async requestPermission() {
    if (!browserNotificationsSupported()) return;
    this.permission = await Notification.requestPermission();
  }

  start(role: NotifiableRole) {
    if (!browser) return;
    if (this.interval && this.role === role) return;
    this.stop();
    this.role = role;
    this.fetch();
    this.interval = setInterval(() => this.fetch(), 15000); // every 15s
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.role = null;
    this.knownCount = null;
    this.count = 0;
  }

  async fetch() {
    if (!this.role) return;
    try {
      const contact = await unreadContactMessageCount();
      let total = contact.count;
      if (this.role === "apprenant") {
        const legacy = await unreadCount();
        total += legacy.count;
      }

      // Un nouveau message est arrive depuis le dernier sondage : on notifie
      // dans l'appli (toast) plutot que de se contenter de mettre a jour le
      // badge en silence. `knownCount` demarre a `null` pour ne jamais
      // notifier au premier chargement (compte deja existant, pas "nouveau").
      if (this.knownCount !== null && total > this.knownCount) {
        const diff = total - this.knownCount;
        const text = diff > 1 ? `${diff} nouveaux messages reçus` : "Nouveau message reçu";
        snackbar.show(text, "info");

        // En plus du toast interne, une vraie notification navigateur/OS si
        // l'utilisateur l'a autorisee et que l'onglet n'est pas au premier
        // plan (sinon le toast suffit, pas besoin de doubler l'alerte).
        if (this.permission === "granted" && document.hidden) {
          const notif = new Notification("Trankyl Academy", {
            body: text,
            icon: "/favicon.svg",
            tag: "trankyl-new-message",
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        }
      }
      this.knownCount = total;
      this.count = total;
    } catch {
      // silently fail
    }
  }
}

export const notifications = new NotificationStore();
