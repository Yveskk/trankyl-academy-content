<script lang="ts">
  import KeyRound from "@lucide/svelte/icons/key-round";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { forgotPassword, resetPassword, verifyOtp, type AuthRole } from "$lib/api/auth";

  let role: AuthRole = ($page.url.searchParams.get("role") as AuthRole) ?? "apprenant";

  const loginPathByRole: Record<AuthRole, string> = {
    apprenant: "/login",
    client: "/client/login",
    admin: "/admin/login",
  };

  const roleLabel: Record<AuthRole, string> = {
    apprenant: "apprenant",
    client: "client",
    admin: "administrateur",
  };

  let step = $state<"email" | "code" | "password" | "done">("email");
  let email = $state("");
  let channel = $state<"email" | "sms">("email");
  let code = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let resetToken = $state("");
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleRequestOtp(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      await forgotPassword(email, role, channel);
      step = "code";
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function handleVerifyCode(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      const result = await verifyOtp(email, role, code);
      resetToken = result.reset_token;
      step = "password";
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function handleResetPassword(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    if (newPassword !== confirmPassword) {
      error = "Les mots de passe ne correspondent pas.";
      return;
    }
    loading = true;
    try {
      await resetPassword(email, role, resetToken, newPassword);
      step = "done";
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="card auth-card">
  <span class="icon-badge"><KeyRound size={22} /></span>
  <h1 style="margin-top:1rem">Mot de passe oublié</h1>
  <p class="muted">Réinitialisation pour votre compte {roleLabel[role]}.</p>

  {#if step === "email"}
    <form onsubmit={handleRequestOtp}>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      {#if role !== "admin"}
        <div class="field">
          <label for="channel">Recevoir le code par</label>
          <select id="channel" bind:value={channel}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      {/if}
      <button class="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Envoi..." : "Envoyer le code"}
      </button>
    </form>
  {:else if step === "code"}
    <p class="muted">Un code à 6 chiffres a été envoyé si un compte existe pour cet email. Il est valide 15 minutes.</p>
    <form onsubmit={handleVerifyCode}>
      <div class="field">
        <label for="code">Code de vérification</label>
        <input id="code" bind:value={code} inputmode="numeric" maxlength={6} required />
      </div>
      <button class="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Vérification..." : "Vérifier le code"}
      </button>
    </form>
    <p class="form-footer muted"><button class="link-btn" type="button" onclick={() => (step = "email")}>Renvoyer / changer d'email</button></p>
  {:else if step === "password"}
    <form onsubmit={handleResetPassword}>
      <div class="field">
        <label for="new-password">Nouveau mot de passe</label>
        <input id="new-password" type="password" bind:value={newPassword} required minlength={8} />
      </div>
      <div class="field">
        <label for="confirm-password">Confirmer le mot de passe</label>
        <input id="confirm-password" type="password" bind:value={confirmPassword} required minlength={8} />
      </div>
      <button class="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Enregistrement..." : "Réinitialiser le mot de passe"}
      </button>
    </form>
  {:else if step === "done"}
    <p class="alert" style="background: var(--green-soft); color: var(--green-dark);">
      Mot de passe réinitialisé avec succès.
    </p>
    <button class="btn btn-primary" onclick={() => goto(loginPathByRole[role])}>Se connecter</button>
  {/if}

  {#if error}<p class="alert alert-error">{error}</p>{/if}

  {#if step !== "done"}
    <p class="form-footer muted"><a href={loginPathByRole[role]}>← Retour à la connexion</a></p>
  {/if}
</div>

<style>
  .link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--green-dark);
    font-weight: 600;
    font-size: inherit;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
