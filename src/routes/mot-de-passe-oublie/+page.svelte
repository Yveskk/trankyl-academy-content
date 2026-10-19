<script lang="ts">
  import AuthShell from "$lib/components/AuthShell.svelte";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Clock from "@lucide/svelte/icons/clock";
  import Lock from "@lucide/svelte/icons/lock";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { forgotPassword, resetPassword, verifyResetCode, type AuthRole, type Channel } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import ChannelChips from "$lib/components/ChannelChips.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PasswordStrength from "$lib/components/PasswordStrength.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import VerifyPanel from "$lib/components/VerifyPanel.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { VerificationFlow } from "$lib/utils/verificationFlow.svelte";

  const role: AuthRole = (["apprenant", "client", "admin"].includes($page.url.searchParams.get("role") ?? "") ? $page.url.searchParams.get("role") : "apprenant") as AuthRole;
  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  const loginPathByRole: Record<AuthRole, string> = { apprenant: "/login", client: "/client/login", admin: "/admin/login" };
  const roleLabel: Record<AuthRole, [string, string]> = { apprenant: ["apprenant", "learner"], client: ["client", "customer"], admin: ["administrateur", "administrator"] };

  let step = $state<"request" | "verify" | "password" | "done">("request");
  let by = $state<"phone" | "email">(role === "admin" ? "email" : "phone");
  let email = $state("");
  let countryCode = $state("228");
  let phone = $state("");
  let channel = $state<Channel>(role === "admin" ? "email" : "whatsapp");
  let loading = $state(false);
  let resetToken = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");

  const flow = new VerificationFlow<{ reset_token: string }>({
    verify: (requestId, code) => verifyResetCode(requestId, code),
    onSuccess: (r) => {
      resetToken = r.reset_token;
      step = "password";
    },
  });

  let identifier = $derived(by === "email" ? email.trim() : `+${countryCode}${phone}`);

  async function request(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    try {
      const res = await forgotPassword(identifier, role, channel, i18n.locale);
      if (flow.begin(res)) step = "verify";
    } catch (e) {
      const message = flow.fail(e);
      if (flow.challenge) step = "verify";
      else snackbar.error(message);
    } finally {
      loading = false;
    }
  }

  async function savePassword(event: SubmitEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      snackbar.error(t("Les mots de passe ne correspondent pas.", "Passwords do not match."));
      return;
    }
    loading = true;
    try {
      await resetPassword(resetToken, newPassword);
      snackbar.success(t("Mot de passe réinitialisé.", "Password reset."));
      step = "done";
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  const values = $derived([
    { icon: ShieldCheck, text: t("Code à usage unique, jamais réutilisable", "One-time code, never reusable") },
    { icon: Clock, text: t("Valable quelques minutes seulement", "Valid for a few minutes only") },
    { icon: Lock, text: t("Votre mot de passe n'est jamais envoyé", "Your password is never sent") },
  ]);

  function backToRequest() {
    flow.reset();
    step = "request";
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AuthShell
  title={t("Retrouvez l'accès à votre compte.", "Get back into your account.")}
  text={t("Un code à usage unique vous est envoyé : en quelques instants, vous choisissez un nouveau mot de passe.", "A one-time code is sent to you: within moments you choose a new password.")}
  variant={role === "admin" ? "green" : role === "apprenant" ? ($page.url.searchParams.get("profil") === "prestataire" ? "gray" : "leaf") : "gold"}
  {values}
>
  {#if step === "verify" && flow.challenge}
    <VerifyPanel {flow} context={t("Trankyl Academy · Réinitialisation du mot de passe", "Trankyl Academy · Password reset")} backLabel={t("Modifier mes informations", "Change my details")} onback={backToRequest} />
  {:else}
    <span class="icon-badge"><KeyRound size={22} /></span>
    <h1 style="margin-top:1rem">{t("Mot de passe oublié", "Forgot password")}</h1>
    <p class="muted">{t("Réinitialisation pour votre compte", "Reset for your")} {en ? roleLabel[role][1] : roleLabel[role][0]}{en ? " account." : "."}</p>

    {#if step === "request"}
      <form onsubmit={request}>
        {#if role !== "admin"}
          <div class="seg" role="tablist" aria-label={t("Identifiant", "Identifier")}>
            <button type="button" role="tab" aria-selected={by === "phone"} class:on={by === "phone"} onclick={() => (by = "phone")}>{t("Téléphone", "Phone")}</button>
            <button type="button" role="tab" aria-selected={by === "email"} class:on={by === "email"} onclick={() => (by = "email")}>Email</button>
          </div>
        {/if}
        {#if by === "email"}
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" bind:value={email} required autocomplete="email" />
          </div>
        {:else}
          <PhoneField bind:countryCode bind:phone label={t("Téléphone", "Phone")} />
        {/if}
        <ChannelChips bind:value={channel} channels={role === "admin" ? ["email"] : ["whatsapp", "sms", "email"]} />
        <Btn type="submit" class="btn-primary" {loading}>{loading ? t("Envoi...", "Sending...") : t("Envoyer le code", "Send the code")}</Btn>
        <p class="muted small">{t("Pour votre sécurité, nous ne confirmons jamais si un compte existe : si c'est le cas, vous recevrez un code.", "For your security we never confirm whether an account exists: if it does, you will receive a code.")}</p>
      </form>
    {:else if step === "password"}
      <form onsubmit={savePassword}>
        <div class="field">
          <label for="new-password">{t("Nouveau mot de passe", "New password")}</label>
          <PasswordInput bind:value={newPassword} id="new-password" autocomplete="new-password" minlength={8} />
          <PasswordStrength password={newPassword} {email} />
        </div>
        <div class="field">
          <label for="confirm-password">{t("Confirmer le mot de passe", "Confirm password")}</label>
          <PasswordInput bind:value={confirmPassword} id="confirm-password" autocomplete="new-password" minlength={8} />
        </div>
        <Btn type="submit" class="btn-primary" {loading}>{loading ? t("Enregistrement...", "Saving...") : t("Réinitialiser le mot de passe", "Reset password")}</Btn>
      </form>
      <p class="muted small">{t("Après la réinitialisation, vos autres appareils devront être re-vérifiés.", "After the reset, your other devices will need to be verified again.")}</p>
    {:else if step === "done"}
      <div class="done">
        <span class="done-icon"><CircleCheck size={34} /></span>
        <p>{t("Mot de passe réinitialisé avec succès.", "Password reset successfully.")}</p>
      </div>
      <Btn class="btn-primary" onclick={() => goto(loginPathByRole[role])}>{t("Se connecter", "Sign in")}</Btn>
    {/if}

    {#if step !== "done"}
      <p class="form-footer muted"><a href={loginPathByRole[role]}>← {t("Retour à la connexion", "Back to sign in")}</a></p>
    {/if}
  {/if}
</AuthShell>
<style>
  .seg {
    display: inline-grid;
    grid-auto-flow: column;
    background: #eef0ee;
    border-radius: 999px;
    padding: 0.2rem;
    margin-bottom: 0.2rem;
    width: fit-content;
  }
  .seg button {
    border: 0;
    background: transparent;
    border-radius: 999px;
    padding: 0.4rem 1rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--ink-soft);
  }
  .seg button.on {
    background: #fff;
    color: var(--ink);
    box-shadow: var(--shadow-sm);
  }
  .done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 1.2rem 1rem;
    margin-bottom: 1rem;
    border-radius: 16px;
    background: var(--green-soft);
    color: var(--green-deep);
    text-align: center;
    font-weight: 700;
  }
  .done p {
    margin: 0;
  }
  .done-icon {
    animation: auth-pop 0.7s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  .small {
    font-size: 0.78rem;
    margin: 0.4rem 0 0;
  }
</style>
