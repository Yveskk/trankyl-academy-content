<script lang="ts">
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Award from "@lucide/svelte/icons/award";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { goto } from "$app/navigation";
  import { login, register } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";

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

<div class="auth-split">
  <div class="auth-brand-panel">
    <img class="auth-brand-logo" src="/logo.svg" alt="Trankyl" />
    <div class="auth-brand-body">
      <h2 class="auth-brand-title">{i18n.dict.register.brandTitle}</h2>
      <p class="auth-brand-text">{i18n.dict.register.brandText}</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon"><BookOpen size={17} /></span>{i18n.dict.register.value1}</div>
        <div class="auth-value-item"><span class="value-icon"><Award size={17} /></span>{i18n.dict.register.value2}</div>
        <div class="auth-value-item"><span class="value-icon"><Sparkles size={17} /></span>{i18n.dict.register.value3}</div>
      </div>
    </div>
  </div>

  <div class="auth-form-panel">
    <span class="icon-badge gold"><UserPlus size={22} /></span>
    <h1>{i18n.dict.register.title}</h1>
    <p class="muted">{i18n.dict.register.subtitle}</p>

    <form onsubmit={handleSubmit}>
      <div class="name-row">
        <div class="field">
          <label for="firstname">{i18n.dict.register.firstname}</label>
          <input id="firstname" bind:value={firstname} required />
        </div>
        <div class="field">
          <label for="lastname">{i18n.dict.register.lastname}</label>
          <input id="lastname" bind:value={lastname} required />
        </div>
      </div>
      <div class="field">
        <label for="email">{i18n.dict.register.email}</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="phone">{i18n.dict.register.phone}</label>
        <input id="phone" bind:value={phone} />
      </div>
      <div class="field">
        <label for="password">{i18n.dict.register.password}</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button class="btn btn-gold" type="submit" disabled={loading}>
        {loading ? i18n.dict.register.submitLoading : i18n.dict.register.submit}
      </button>
    </form>

    {#if error}<p class="alert alert-error">{error}</p>{/if}
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
