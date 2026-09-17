<script lang="ts">
  import LogIn from "@lucide/svelte/icons/log-in";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Clock from "@lucide/svelte/icons/clock";
  import { goto } from "$app/navigation";
  import { loginClient } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";

  let email = $state("");
  let password = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
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

<div class="auth-split">
  <div class="auth-brand-panel">
    <img class="auth-brand-logo" src="/logo.svg" alt="Trankyl" />
    <div class="auth-brand-body">
      <h2 class="auth-brand-title">Trouvez le bon prestataire.</h2>
      <p class="auth-brand-text">Connectez-vous pour discuter avec SITA et trouver un professionnel certifié pour vos besoins.</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon"><Sparkles size={17} /></span>Recommandations par SITA, notre assistant IA</div>
        <div class="auth-value-item"><span class="value-icon"><ShieldCheck size={17} /></span>Uniquement des prestataires vérifiés</div>
        <div class="auth-value-item"><span class="value-icon"><Clock size={17} /></span>Suivi de vos échanges et demandes</div>
      </div>
    </div>
  </div>

  <div class="auth-form-panel">
    <span class="icon-badge"><LogIn size={22} /></span>
    <h1>Connexion</h1>
    <p class="muted">Accédez à votre espace pour trouver un prestataire.</p>

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button class="btn btn-gold" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>

    {#if error}<p class="alert alert-error">{error}</p>{/if}
    <p class="form-footer muted">Pas encore de compte ? <a href="/client/register">Inscrivez-vous</a></p>
    <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=client">Mot de passe oublié ?</a></p>
  </div>
</div>
