<script lang="ts">
  import LogIn from "@lucide/svelte/icons/log-in";
  import { goto } from "$app/navigation";
  import { login } from "$lib/api/auth";
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
      const token = await login(email, password);
      auth.login(token.access_token, "apprenant");
      goto("/dashboard");
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="card auth-card">
  <span class="icon-badge"><LogIn size={22} /></span>
  <h1 style="margin-top:1rem">Connexion</h1>
  <p class="muted">Accedez a votre espace apprenant.</p>

  <form onsubmit={handleSubmit}>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} required />
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input id="password" type="password" bind:value={password} required />
    </div>
    <button class="btn btn-primary" type="submit" disabled={loading}>
      {loading ? "Connexion..." : "Se connecter"}
    </button>
  </form>

  {#if error}<p class="alert alert-error">{error}</p>{/if}
  <p class="muted">Pas encore de compte ? <a href="/register">Inscrivez-vous</a></p>
</div>
