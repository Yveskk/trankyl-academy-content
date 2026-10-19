<script lang="ts">
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { safeRedirect } from "$lib/utils/redirect";
  import Clock from "@lucide/svelte/icons/clock";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import type { AuthResult } from "$lib/api/auth";
  import AuthShell from "$lib/components/AuthShell.svelte";
  import SignupWizard from "$lib/components/SignupWizard.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { setDeviceToken } from "$lib/utils/device";

  const values = [
    { img: "/sita.png", text: "Recommandations par SITA, notre assistant IA" },
    { icon: ShieldCheck, text: "Uniquement des prestataires vérifiés" },
    { icon: Clock, text: "Une réponse en quelques minutes" },
  ];
  let step = $state<"info" | "channel" | "code">("info");
  // Retour automatique vers la page d'ou vient le client (reservation, devis...) : ?redirect=/profil/...
  const redirectParam = $derived($page.url.searchParams.get("redirect"));
  const loginHref = $derived(redirectParam ? `/client/login?redirect=${encodeURIComponent(redirectParam)}` : "/client/login");

  let completed = false;
  $effect(() => {
    if (auth.role === "client" && !completed) {
      untrack(() => {
        snackbar.success("Vous avez déjà un compte — voici votre espace.");
        goto(safeRedirect(redirectParam));
      });
    }
  });

  async function finish(res: AuthResult) {
    if (!res.access_token) return;
    completed = true;
    setDeviceToken("client", res.device_token);
    auth.login(res.access_token, "client");
    snackbar.success("Compte créé et vérifié. Bienvenue !");
    await goto(safeRedirect(redirectParam));
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AuthShell title="Un besoin à la maison ?" text="Créez votre compte pour discuter avec SITA et trouver rapidement un prestataire certifié." {values}>
  {#if step === "info"}
    <h1>Créer un compte</h1>
    <p class="muted">Pour trouver un prestataire de confiance sur Trankyl.</p>
  {/if}
  <SignupWizard profile="client" bind:step cta="Créer mon compte" haveAccount="Déjà un compte ?" signIn="Connectez-vous" {loginHref} onsuccess={finish} />
</AuthShell>
