<script lang="ts">
  import AuthShell from "$lib/components/AuthShell.svelte";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Clock from "@lucide/svelte/icons/clock";
  import { goto } from "$app/navigation";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import { page } from "$app/stores";
  import { safeRedirect } from "$lib/utils/redirect";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import { loginVerify, loginClient, type AuthResult } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import VerifyPanel from "$lib/components/VerifyPanel.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { setDeviceToken } from "$lib/utils/device";
  import { VerificationFlow } from "$lib/utils/verificationFlow.svelte";

  let countryCode = $state("228");
  let phone = $state("");
  let password = $state("");
  let loading = $state(false);

  async function finish(res: AuthResult) {
    if (!res.access_token) return;
    setDeviceToken("client", res.device_token);
    auth.login(res.access_token, "client");
    snackbar.success("Connexion réussie.");
    await goto(safeRedirect($page.url.searchParams.get("redirect")));
  }

  const flow = new VerificationFlow<AuthResult>({ verify: loginVerify, onSuccess: finish });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    try {
      const res = await loginClient(`+${countryCode}${phone}`, password, { lang: i18n.locale });
      if (!flow.begin(res)) await finish(res);
    } catch (e) {
      const message = flow.fail(e);
      if (!flow.challenge) snackbar.error(message);
    } finally {
      loading = false;
    }
  }

  const values = [
    { img: "/sita.png", text: "Recommandations par SITA, notre assistant IA" },
    { icon: ShieldCheck, text: "Uniquement des prestataires vérifiés" },
    { icon: Clock, text: "Suivi de vos échanges et demandes" },
  ];
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AuthShell title="Trouvez le bon prestataire." text="Connectez-vous pour discuter avec SITA et trouver un professionnel certifié pour vos besoins." {values}>
    
    {#if flow.challenge}
      <VerifyPanel {flow} trustOption context="Trankyl Academy · Vérification de sécurité" backLabel="Modifier mes informations" onback={() => flow.reset()} />
    {:else}
    <h1>Connexion</h1>
    <p class="muted">Accédez à votre espace pour trouver un prestataire.</p>

    <form onsubmit={handleSubmit}>
      <PhoneField bind:countryCode bind:phone label="Téléphone" />
      <div class="field">
        <label for="password">Mot de passe</label>
        <PasswordInput bind:value={password} id="password" autocomplete="current-password" />
      </div>
      <Btn type="submit" class="btn-gold" {loading}>{loading ? "Connexion..." : "Se connecter"}</Btn>
    </form>

    <p class="form-footer muted">Pas encore de compte ? <a href="/client/register">Inscrivez-vous</a></p>
    <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=client">Mot de passe oublié ?</a></p>
    {/if}
</AuthShell>
