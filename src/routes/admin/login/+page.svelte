<script lang="ts">
  import Shield from "@lucide/svelte/icons/shield";
  import Lock from "@lucide/svelte/icons/lock";
  import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
  import Layers from "@lucide/svelte/icons/layers";
  import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
  import { goto } from "$app/navigation";
  import { adminLogin } from "$lib/api/auth";
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
      const token = await adminLogin(email, password);
      auth.login(token.access_token, "admin");
      goto("/admin/dashboard");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-split admin-auth-split">
  <div class="auth-brand-panel">
    <img class="auth-brand-logo" src="/logo-wh.svg" alt="Trankyl" />
    <div class="auth-brand-body">
      <h2 class="auth-brand-title">Espace administration</h2>
      <p class="auth-brand-text">Gérez la taxonomie, le curriculum, les apprenants et le contenu de Trankyl Academy.</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon"><Layers size={17} /></span>Taxonomie & curriculum</div>
        <div class="auth-value-item"><span class="value-icon"><BarChart3 size={17} /></span>Suivi des apprenants et certifications</div>
        <div class="auth-value-item"><span class="value-icon"><LayoutDashboard size={17} /></span>Tableau de bord centralisé</div>
      </div>
    </div>
  </div>

  <div class="auth-form-panel">
    <span class="icon-badge"><Shield size={22} /></span>
    <h1>Administration</h1>
    <p class="muted">Connectez-vous pour accéder au panneau de gestion.</p>

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="email">Adresse email</label>
        <input id="email" type="email" placeholder="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <div class="password-input">
          <Lock size={16} class="lock-icon" />
          <input id="password" type="password" placeholder="••••••••" bind:value={password} required />
        </div>
      </div>
      <button class="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>

    {#if error}<p class="alert alert-error">{error}</p>{/if}
    <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=admin">Mot de passe oublié ?</a></p>
    <p class="form-footer muted"><a href="/">← Retour au site public</a></p>
  </div>
</div>

<style>
  .admin-auth-split :global(.auth-brand-panel) {
    background: linear-gradient(155deg, #0a1f10 0%, #04330d 55%, #0a1f10 130%);
  }

  .password-input {
    position: relative;
  }

  .password-input :global(.lock-icon) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .password-input input {
    padding-left: 2.5rem;
    width: 100%;
  }
</style>
