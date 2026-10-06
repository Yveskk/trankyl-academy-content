<script lang="ts">
  import LogIn from "@lucide/svelte/icons/log-in";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Clock from "@lucide/svelte/icons/clock";
  import { goto } from "$app/navigation";
  import { loginClient } from "$lib/api/auth";
  import { auth } from "$lib/stores/auth.svelte";
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
      const token = await loginClient(`+${countryCode}${phone}`, password);
      auth.login(token.access_token, "client");
      snackbar.success("Connexion réussie.");
      await goto("/prestataires");
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
      <h2 class="auth-brand-title">Trouvez le bon prestataire.</h2>
      <p class="auth-brand-text">Connectez-vous pour discuter avec SITA et trouver un professionnel certifié pour vos besoins.</p>
      <div class="auth-value-list">
        <div class="auth-value-item"><span class="value-icon value-icon--logo"><img src="/sita.png" alt="SITA" class="value-icon-logo" /></span>Recommandations par SITA, notre assistant IA</div>
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
      <PhoneField bind:countryCode bind:phone label="Téléphone" />
      <div class="field">
        <label for="password">Mot de passe</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button class="btn btn-gold" type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>

    <p class="form-footer muted">Pas encore de compte ? <a href="/client/register">Inscrivez-vous</a></p>
    <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=client">Mot de passe oublié ?</a></p>
  </div>
</div>

<style>
  .value-icon--logo {
    background: none;
  }
  .value-icon-logo {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }
</style>
