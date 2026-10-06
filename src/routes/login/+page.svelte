<script lang="ts">
  import LogIn from "@lucide/svelte/icons/log-in";
  import Gauge from "@lucide/svelte/icons/gauge";
  import Award from "@lucide/svelte/icons/award";
  import Users from "@lucide/svelte/icons/users";
  import { goto } from "$app/navigation";
  import { login } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";

  let countryCode = $state("228");
  let phone = $state("");
  let password = $state("");
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    try {
      const token = await login(`+${countryCode}${phone}`, password);
      auth.login(token.access_token, "apprenant");
      snackbar.success("Connexion réussie.");
      await goto("/dashboard");
    } catch (e) {
      snackbar.error((e as Error).message);
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
    <!-- <img class="auth-brand-logo" src="/academiLogo.png" alt="Trankyl" /> -->
    <div class="auth-brand-body">
      <h2 class="auth-brand-title">{i18n.dict.login.brandTitle}</h2>
      <p class="auth-brand-text">{i18n.dict.login.brandText}</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon"><Gauge size={17} /></span>{i18n.dict.login.value1}</div>
        <div class="auth-value-item"><span class="value-icon"><Award size={17} /></span>{i18n.dict.login.value2}</div>
        <div class="auth-value-item"><span class="value-icon"><Users size={17} /></span>{i18n.dict.login.value3}</div>
      </div>
    </div>
  </div>

  <div class="auth-form-panel">
    <span class="icon-badge"><LogIn size={22} /></span>
    <h1>{i18n.dict.login.title}</h1>
    <p class="muted">{i18n.dict.login.subtitle}</p>

    <form onsubmit={handleSubmit}>
      <PhoneField bind:countryCode bind:phone label={i18n.dict.login.phone} />
      <div class="field">
        <label for="password">{i18n.dict.login.password}</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button class="btn btn-gold" type="submit" disabled={loading}>
        {loading ? i18n.dict.login.submitLoading : i18n.dict.login.submit}
      </button>
    </form>

    <p class="form-footer muted">{i18n.dict.login.noAccount} <a href="/register">{i18n.dict.login.signUp}</a></p>
    <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=apprenant">{i18n.dict.login.forgotPassword}</a></p>
  </div>
</div>
