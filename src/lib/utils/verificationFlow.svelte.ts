/**
 * Etat d'une verification par code (inscription, connexion, mot de passe
 * oublie) partage par toutes les pages d'authentification : demande en cours,
 * erreur a afficher, appel serveur en cours, renvoi / changement de canal.
 */
import { ApiError } from "$lib/api/client";
import type { AuthResult, Channel } from "$lib/api/auth";
import { resendCode } from "$lib/api/auth";
import { snackbar } from "$lib/stores/snackbar.svelte";

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "email" };

export type Challenge = {
  request_id: string;
  channel: Channel;
  destination_masked: string;
  expires_in: number;
  resend_in: number;
  channels: Channel[];
  /** Pour redemarrer le compte a rebours quand un nouveau code est envoye. */
  sentAt: number;
};

export function toChallenge(res: AuthResult): Challenge | null {
  if (res.status !== "verification_required" || !res.request_id || !res.channel) return null;
  return {
    request_id: res.request_id,
    channel: res.channel,
    destination_masked: res.destination_masked ?? "",
    expires_in: res.expires_in ?? 600,
    resend_in: res.resend_in ?? 60,
    channels: res.channels?.length ? res.channels : [res.channel],
    sentAt: Date.now(),
  };
}

export class VerificationFlow<T = AuthResult> {
  challenge = $state<Challenge | null>(null);
  error = $state<string | null>(null);
  busy = $state(false);
  /** Ouvre directement la liste des autres canaux (ex. WhatsApp en panne). */
  suggestAlternatives = $state(false);

  #verify: (requestId: string, code: string, trust: boolean) => Promise<T>;
  #success: (result: T) => void | Promise<void>;

  constructor(opts: { verify: (requestId: string, code: string, trust: boolean) => Promise<T>; onSuccess: (result: T) => void | Promise<void> }) {
    this.#verify = opts.verify;
    this.#success = opts.onSuccess;
  }

  /** Reponse d'une premiere etape : renvoie true si un code est a saisir. */
  begin(res: AuthResult): boolean {
    const ch = toChallenge(res);
    if (!ch) return false;
    this.challenge = ch;
    this.error = null;
    this.suggestAlternatives = false;
    snackbar.success(`Code envoyé par ${CHANNEL_LABEL[ch.channel]}${ch.destination_masked ? ` à ${ch.destination_masked}` : ""}.`);
    return true;
  }

  /** Erreur d'une premiere etape. Un envoi echoue (502) garde la demande : on propose un autre canal. */
  fail(e: unknown): string {
    const err = e as ApiError;
    if (err instanceof ApiError && err.status === 502 && err.data?.request_id) {
      this.challenge = {
        request_id: err.data.request_id,
        channel: (err.data.channel as Channel) ?? "whatsapp",
        destination_masked: "",
        expires_in: err.data.expires_in ?? 600,
        resend_in: 0,
        channels: (err.data.channels as Channel[]) ?? [],
        sentAt: Date.now(),
      };
      this.suggestAlternatives = true;
      this.error = err.message;
      snackbar.error(err.message);
      return err.message;
    }
    return err?.message ?? "Une erreur est survenue.";
  }

  async submit(code: string, trust = false) {
    if (!this.challenge || this.busy) return;
    this.busy = true;
    this.error = null;
    try {
      const result = await this.#verify(this.challenge.request_id, code, trust);
      await this.#success(result);
    } catch (e) {
      const err = e as ApiError;
      this.error = err.message || "Code incorrect.";
      const left = err.data?.attempts_left;
      if (typeof left === "number" && left >= 0) this.error = `${err.message} ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}.`;
      snackbar.error(this.error);
    } finally {
      this.busy = false;
    }
  }

  async resend(channel?: Channel): Promise<boolean> {
    if (!this.challenge || this.busy) return false;
    this.busy = true;
    this.error = null;
    try {
      const res = await resendCode(this.challenge.request_id, channel);
      const ch = toChallenge(res);
      if (ch) this.challenge = ch;
      this.suggestAlternatives = false;
      snackbar.success(ch ? `Nouveau code envoyé par ${CHANNEL_LABEL[ch.channel]}.` : "Nouveau code envoyé.");
      return true;
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 502 && err.data?.channels) {
        this.error = err.message;
        this.suggestAlternatives = true;
      } else {
        this.error = err.message;
      }
      snackbar.error(err.message);
      return false;
    } finally {
      this.busy = false;
    }
  }

  reset() {
    this.challenge = null;
    this.error = null;
    this.suggestAlternatives = false;
    this.busy = false;
  }
}
