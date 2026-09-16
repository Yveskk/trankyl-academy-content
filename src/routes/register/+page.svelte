<script lang="ts">
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import { goto } from "$app/navigation";
  import { login, register } from "$lib/api/auth";
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
      await register({ firstname, lastname, email, password, phone: phone || undefined });
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
  <span class="icon-badge gold"><UserPlus size={22} /></span>
  <h1 style="margin-top:1rem">Inscription</h1>
  <p class="muted">Creez votre compte apprenant Trankyl Academy.</p>

  <form onsubmit={handleSubmit}>
    <div class="field">
      <label for="firstname">Prenom</label>
      <input id="firstname" bind:value={firstname} required />
    </div>
    <div class="field">
      <label for="lastname">Nom</label>
      <input id="lastname" bind:value={lastname} required />
    </div>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} required />
    </div>
    <div class="field">
      <label for="phone">Telephone (optionnel)</label>
      <input id="phone" bind:value={phone} />
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input id="password" type="password" bind:value={password} required />
    </div>
    <button class="btn btn-primary" type="submit" disabled={loading}>
      {loading ? "Creation..." : "Creer mon compte"}
    </button>
  </form>

  {#if error}<p class="alert alert-error">{error}</p>{/if}
</div>
