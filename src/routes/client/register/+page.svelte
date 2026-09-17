<script lang="ts">
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Clock from "@lucide/svelte/icons/clock";
  import { goto } from "$app/navigation";
  import { loginClient, registerClient } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";

  let firstname = $state("");
  let lastname = $state("");
  let email = $state("");
  let phone = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      await registerClient({ firstname, lastname, email, password, phone: phone || undefined });
      const token = await loginClient(email, password);
      auth.login(token.access_token, "client");
      goto("/prestataires");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="auth-split">
  <div class="auth-brand-panel">
    <img class="auth-brand-logo" src="/logo.svg" alt="Trankyl" />
    <div class="auth-brand-body">
      <h2 class="auth-brand-title">Un besoin à la maison ?</h2>
      <p class="auth-brand-text">Créez votre compte pour discuter avec SITA et trouver rapidement un prestataire certifié.</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon"><Sparkles size={17} /></span>Recommandations par SITA, notre assistant IA</div>
        <div class="auth-value-item"><span class="value-icon"><ShieldCheck size={17} /></span>Uniquement des prestataires vérifiés</div>
        <div class="auth-value-item"><span class="value-icon"><Clock size={17} /></span>Une réponse en quelques minutes</div>
      </div>
    </div>
  </div>

  <div class="auth-form-panel">
    <span class="icon-badge gold"><UserPlus size={22} /></span>
    <h1>Créer un compte</h1>
    <p class="muted">Pour trouver un prestataire certifié Trankyl Academy.</p>

    <form onsubmit={handleSubmit}>
      <div class="name-row">
        <div class="field">
          <label for="firstname">Prénom</label>
          <input id="firstname" bind:value={firstname} required />
        </div>
        <div class="field">
          <label for="lastname">Nom</label>
          <input id="lastname" bind:value={lastname} required />
        </div>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="phone">Téléphone (optionnel)</label>
        <input id="phone" bind:value={phone} />
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button class="btn btn-gold" type="submit" disabled={loading}>
        {loading ? "Création..." : "Créer mon compte"}
      </button>
    </form>

    {#if error}<p class="alert alert-error">{error}</p>{/if}
    <p class="form-footer muted">Déjà un compte ? <a href="/client/login">Connectez-vous</a></p>
  </div>
</div>

<style>
  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .name-row {
      grid-template-columns: 1fr;
    }
  }
</style>
