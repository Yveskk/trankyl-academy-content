<script lang="ts">
  import AuthShell from "$lib/components/AuthShell.svelte";
  import Gauge from "@lucide/svelte/icons/gauge";
  import Award from "@lucide/svelte/icons/award";
  import Users from "@lucide/svelte/icons/users";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import ClipboardList from "@lucide/svelte/icons/clipboard-list";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import { copyFor, profileFromSearch } from "$lib/utils/profileCopy";
  import { i18n } from "$lib/stores/locale.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import { loginVerify, login, me, type AuthResult } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import VerifyPanel from "$lib/components/VerifyPanel.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { setDeviceToken } from "$lib/utils/device";
  import { VerificationFlow } from "$lib/utils/verificationFlow.svelte";

  let countryCode = $state("228");
  let phone = $state("");
  let password = $state("");
  let loading = $state(false);

  async function finish(res: AuthResult) {
    if (!res.access_token) return;
    setDeviceToken("apprenant", res.device_token);
    auth.login(res.access_token, "apprenant");
    snackbar.success("Connexion réussie.");
    if (isProvider) {
      // Connexion « prestataire » : on vérifie le type du compte (un compte apprenant n'a pas d'espace prestataire).
      const p = await me().catch(() => null);
      if (p && (p.academy_status === "provider" || p.academy_status === "certified_provider")) return void (await goto("/prestataire"));
      if (p) snackbar.error("Ce compte est un compte apprenant, pas un compte prestataire. Créez un compte prestataire pour accéder à cet espace.");
    }
    await goto("/apprenant");
  }

  const flow = new VerificationFlow<AuthResult>({ verify: loginVerify, onSuccess: finish });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    try {
      const res = await login(`+${countryCode}${phone}`, password, { lang: i18n.locale });
      if (!flow.begin(res)) await finish(res);
    } catch (e) {
      const message = flow.fail(e);
      if (!flow.challenge) snackbar.error(message);
    } finally {
      loading = false;
    }
  }

  // /login = apprenant ; /login?profil=prestataire = textes prestataire (meme espace de connexion).
  const profile = $derived(profileFromSearch($page.url.searchParams));
  const isProvider = $derived(profile === "prestataire");
  const copy = $derived(copyFor(profile, i18n.locale));
  const icons = $derived(isProvider ? [BadgeCheck, ClipboardList, Award] : [Gauge, Award, Users]);
  const values = $derived(copy.login.values.map((text, i) => ({ text, icon: icons[i] })));
  const signUpHref = $derived(isProvider ? "/register?profil=prestataire" : "/register");
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AuthShell variant={isProvider ? "gray" : "leaf"} title={copy.login.brandTitle} text={copy.login.brandText} {values}>
    
    {#if flow.challenge}
      <VerifyPanel {flow} trustOption context="Trankyl Academy · Vérification de sécurité" backLabel="Modifier mes informations" onback={() => flow.reset()} />
    {:else}
    <h1>{copy.login.title}</h1>
    <p class="muted">{copy.login.subtitle}</p>

    <form onsubmit={handleSubmit}>
      <PhoneField bind:countryCode bind:phone label={i18n.dict.login.phone} />
      <div class="field">
        <label for="password">{i18n.dict.login.password}</label>
        <PasswordInput bind:value={password} id="password" autocomplete="current-password" />
      </div>
      <Btn type="submit" class="btn-gold" {loading}>{loading ? i18n.dict.login.submitLoading : i18n.dict.login.submit}</Btn>
    </form>

    <p class="form-footer muted">{copy.login.noAccount} <a href={signUpHref}>{copy.login.signUp}</a></p>
    <p class="form-footer muted"><a href={isProvider ? "/mot-de-passe-oublie?role=apprenant&profil=prestataire" : "/mot-de-passe-oublie?role=apprenant"}>{i18n.dict.login.forgotPassword}</a></p>
    {/if}
</AuthShell>