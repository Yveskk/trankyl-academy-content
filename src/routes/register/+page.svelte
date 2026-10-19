<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Award from "@lucide/svelte/icons/award";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Users from "@lucide/svelte/icons/users";
  import type { AuthResult } from "$lib/api/auth";
  import AuthShell from "$lib/components/AuthShell.svelte";
  import SignupWizard from "$lib/components/SignupWizard.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { setDeviceToken } from "$lib/utils/device";
  import { copyFor, profileFromSearch } from "$lib/utils/profileCopy";

  // /register = apprenant ; /register?profil=prestataire = professionnel qui exerce deja (certificat non requis).
  const profile = $derived(profileFromSearch($page.url.searchParams));
  const isProvider = $derived(profile === "prestataire");
  const copy = $derived(copyFor(profile, i18n.locale));
  const icons = $derived(isProvider ? [Users, BadgeCheck, Award] : [BookOpen, Award, Sparkles]);
  const values = $derived(copy.register.values.map((text, i) => ({ text, icon: icons[i] })));
  const loginHref = $derived(isProvider ? "/login?profil=prestataire" : "/login");
  let step = $state<"info" | "channel" | "code">("info");

  // Deja connecte avec ce role : inutile de se reinscrire.
  // `untrack` : snackbar.success() lit/ecrit la liste des notifications ; sans cela l'effet se
  // redeclencherait indefiniment. `completed` evite ce message juste apres une inscription reussie.
  let completed = false;
  $effect(() => {
    if (auth.role === "apprenant" && !completed) {
      untrack(() => {
        snackbar.success("Vous avez déjà un compte — voici votre espace.");
        goto(isProvider ? "/prestataire" : "/apprenant");
      });
    }
  });

  async function finish(res: AuthResult) {
    if (!res.access_token) return;
    completed = true;
    setDeviceToken("apprenant", res.device_token);
    auth.login(res.access_token, "apprenant");
    snackbar.success(isProvider ? "Compte prestataire créé. Votre profil sera visible dans l'annuaire après vérification par notre équipe." : "Compte créé et vérifié. Bienvenue !");
    // Prestataire : il continue dans son espace (profil -> formulaire d'enrôlement -> tableau de bord).
    await goto(isProvider ? "/prestataire" : "/apprenant");
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AuthShell variant={isProvider ? "gray" : "leaf"} title={copy.register.brandTitle} text={copy.register.brandText} {values}>
  {#if step === "info"}
    <h1>{copy.register.title}</h1>
    <p class="muted">{copy.register.subtitle}</p>
  {/if}
  <SignupWizard {profile} bind:step cta={copy.register.cta} haveAccount={copy.register.haveAccount} signIn={copy.register.signIn} {loginHref} onsuccess={finish} />
</AuthShell>
