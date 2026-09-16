<script lang="ts">
  import LogIn from "@lucide/svelte/icons/log-in";
  import { goto } from "$app/navigation";
  import { login } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";

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
  <h1 style="margin-top:1rem">{i18n.dict.login.title}</h1>
  <p class="muted">{i18n.dict.login.subtitle}</p>

  <form onsubmit={handleSubmit}>
    <div class="field">
      <label for="email">{i18n.dict.login.email}</label>
      <input id="email" type="email" bind:value={email} required />
    </div>
    <div class="field">
      <label for="password">{i18n.dict.login.password}</label>
      <input id="password" type="password" bind:value={password} required />
    </div>
    <button class="btn btn-primary" type="submit" disabled={loading}>
      {loading ? i18n.dict.login.submitLoading : i18n.dict.login.submit}
    </button>
  </form>

  {#if error}<p class="alert alert-error">{error}</p>{/if}
  <p class="muted">{i18n.dict.login.noAccount} <a href="/register">{i18n.dict.login.signUp}</a></p>
</div>
