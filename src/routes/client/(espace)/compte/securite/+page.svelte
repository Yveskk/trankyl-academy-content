<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { changeClientPassword, clientActivity, closeClientAccount, revokeClientDevices, type AccountActivity } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PasswordStrength from "$lib/components/PasswordStrength.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { clientAccount } from "$lib/stores/clientAccount.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { notifications } from "$lib/stores/notifications.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const pending = new Pending();
  const me = $derived(clientAccount.me);

  let curPw = $state("");
  let newPw = $state("");
  let confirmPw = $state("");
  let activity = $state<AccountActivity[]>([]);
  let closing = $state(false);
  let closePw = $state("");

  onMount(async () => {
    activity = await clientActivity().catch(() => []);
  });

  async function savePassword(event: SubmitEvent) {
    event.preventDefault();
    if (newPw !== confirmPw) return void snackbar.error(t("Les deux mots de passe ne correspondent pas.", "The two passwords do not match."));
    await pending.run("password", async () => {
      try {
        await changeClientPassword(curPw, newPw);
        curPw = newPw = confirmPw = "";
        activity = await clientActivity().catch(() => activity);
        snackbar.success(t("Mot de passe modifié. Vos appareils de confiance ont été oubliés.", "Password changed. Your trusted devices were forgotten."));
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function forgetDevices() {
    const ok = await confirmDialog.ask({
      title: t("Oublier mes appareils de confiance ?", "Forget my trusted devices?"),
      message: t("Un code de vérification vous sera redemandé à la prochaine connexion sur chaque appareil.", "A verification code will be asked again at your next sign-in on each device."),
      confirmLabel: t("Oublier les appareils", "Forget devices"),
      action: () => revokeClientDevices(),
    });
    if (ok) {
      snackbar.success(t("Appareils de confiance oubliés.", "Trusted devices forgotten."));
      activity = await clientActivity().catch(() => activity);
    }
  }

  async function closeAccount(event: SubmitEvent) {
    event.preventDefault();
    await pending.run("close", async () => {
      try {
        await closeClientAccount(closePw);
        closing = false;
        snackbar.success(t("Votre compte a été fermé.", "Your account has been closed."));
        notifications.stop();
        clientAccount.clear();
        auth.logout();
        goto("/");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(en ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
</script>

<Seo title={t("Sécurité", "Security")} description={t("Mot de passe, appareils et activité de votre compte.", "Password, devices and account activity.")} noindex />

<div class="ac">
  <div class="ac-head">
    <h1>{t("Sécurité", "Security")}</h1>
    <p>{t("Protégez votre compte et gardez un œil sur son activité.", "Protect your account and keep an eye on its activity.")}</p>
  </div>

  <section class="ac-card">
    <h2>{t("Changer le mot de passe", "Change password")}</h2>
    <form onsubmit={savePassword} novalidate>
      <div class="field"><label for="cp">{t("Mot de passe actuel", "Current password")}</label><PasswordInput id="cp" bind:value={curPw} autocomplete="current-password" /></div>
      <div class="ac-grid2">
        <div class="field"><label for="np">{t("Nouveau mot de passe", "New password")}</label><PasswordInput id="np" bind:value={newPw} autocomplete="new-password" minlength={8} /></div>
        <div class="field"><label for="cf">{t("Confirmer", "Confirm")}</label><PasswordInput id="cf" bind:value={confirmPw} autocomplete="new-password" /></div>
      </div>
      <PasswordStrength password={newPw} email={me?.email ?? ""} />
      <div class="ac-actions"><Btn type="submit" class="btn-primary" loading={pending.is("password")} disabled={!curPw || !newPw}>{t("Modifier le mot de passe", "Update password")}</Btn></div>
    </form>
  </section>

  <section class="ac-card">
    <h2>{t("Appareils de confiance", "Trusted devices")}</h2>
    <p class="ac-muted">{t("Les appareils déjà vérifiés ne demandent pas de code à la connexion. Oubliez-les si vous avez un doute.", "Already verified devices skip the sign-in code. Forget them if in doubt.")}</p>
    <Btn class="btn-outline btn-sm" onclick={forgetDevices}>{t("Oublier mes appareils", "Forget my devices")}</Btn>
  </section>

  <section class="ac-card ac-log-card">
    <h2>{t("Activité récente", "Recent activity")}</h2>
    {#if activity.length === 0}
      <p class="ac-muted">{t("Aucune activité.", "No activity.")}</p>
    {:else}
      <ul class="ac-log">
        {#each activity as a, i (i)}
          <li class:bad={!a.success}><span>{a.label}</span><small>{when(a.at)}{a.ip ? ` · ${a.ip}` : ""}</small></li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="ac-card ac-danger">
    <h2><TriangleAlert size={18} /> {t("Fermer mon compte", "Close my account")}</h2>
    <p class="ac-muted">{t("Votre compte sera désactivé et vous ne pourrez plus vous connecter. Votre historique de réservations est conservé. Impossible tant qu'une réservation est en cours.", "Your account will be deactivated and you will no longer be able to sign in. Your booking history is kept. Not possible while a booking is in progress.")}</p>
    <Btn class="btn-outline btn-danger btn-sm" onclick={() => { closePw = ""; closing = true; }}>{t("Fermer mon compte", "Close my account")}</Btn>
  </section>
</div>

<Modal open={closing} title={t("Fermer mon compte", "Close my account")} width="30rem" locked={pending.is("close")} onclose={() => (closing = false)}>
  <form id="close-form" onsubmit={closeAccount} novalidate>
    <p class="ac-muted">{t("Confirmez avec votre mot de passe. Cette action vous déconnecte immédiatement.", "Confirm with your password. You will be signed out immediately.")}</p>
    <div class="field"><label for="clp">{t("Mot de passe", "Password")}</label><PasswordInput id="clp" bind:value={closePw} autocomplete="current-password" /></div>
  </form>
  {#snippet footer()}
    <Btn class="btn-outline" onclick={() => (closing = false)} disabled={pending.is("close")}>{t("Annuler", "Cancel")}</Btn>
    <Btn type="submit" form="close-form" class="btn-danger" loading={pending.is("close")} disabled={!closePw}>{t("Fermer définitivement", "Close permanently")}</Btn>
  {/snippet}
</Modal>

<style>
  .ac { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem; align-items: start; }
  .ac-head { grid-column: 1 / -1; }
  .ac-log-card, .ac-danger { grid-column: 1 / -1; }
  .ac-head h1 { margin: 0 0 0.25rem; font-size: clamp(1.5rem, 3vw, 2rem); }
  .ac-head p { margin: 0; color: var(--muted, #6b7280); }
  .ac-card { background: #fff; border: 1px solid var(--border, #e4dcc0); border-radius: 16px; padding: 1.3rem; display: flex; flex-direction: column; gap: 0.9rem; }
  .ac-card h2 { margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; }
  .ac-card form { display: flex; flex-direction: column; gap: 0.9rem; max-width: none; width: 100%; }
  .ac-card > :global(.btn) { align-self: flex-start; }
  .ac-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
  .ac-actions { display: flex; justify-content: flex-end; }
  .ac-muted { margin: 0; color: var(--muted, #6b7280); font-size: 0.88rem; }
  .ac-log { list-style: none; margin: 0; padding: 0; }
  .ac-log li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid #eee; font-size: 0.88rem; }
  .ac-log li.bad span { color: var(--danger, #b91c1c); }
  .ac-log small { color: var(--muted, #6b7280); text-align: right; }
  .ac-danger { border-color: #fecaca; }
  .ac-danger h2 { color: #b91c1c; }
  @media (max-width: 1000px) { .ac { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 640px) { .ac-grid2 { grid-template-columns: 1fr; } .ac-log li { flex-direction: column; gap: 0.1rem; } .ac-log small { text-align: left; } }
</style>
