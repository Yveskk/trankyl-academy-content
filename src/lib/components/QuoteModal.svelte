<script lang="ts">
  import { page } from "$app/stores";
  import { createContactRequest } from "$lib/api/contactRequests";
  import { createQuote } from "$lib/api/quotes";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import X from "@lucide/svelte/icons/x";

  let {
    open = $bindable(false),
    vendorId,
    vendorName,
    mode = "quote",
    slotLabel = null,
  }: { open: boolean; vendorId: number; vendorName: string; mode?: "quote" | "message"; slotLabel?: string | null } = $props();

  const en = $derived(i18n.locale === "en");
  let text = $state("");
  let sending = $state(false);
  let error = $state<string | null>(null);
  let done = $state<{ status: string; quote: boolean } | null>(null);

  // Coordonnees demandees seulement aux visiteurs non connectes (un client connecte est identifie par son compte).
  let name = $state("");
  let email = $state("");
  let countryCode = $state("228");
  let phone = $state("");


  let redirect = $derived(encodeURIComponent($page.url.pathname + $page.url.search));
  let isClient = $derived(auth.role === "client");
  let needsContact = $derived(mode === "quote" && !isClient);

  $effect(() => {
    if (open) {
      text = "";
      error = null;
      done = null;
      name = "";
      email = "";
      phone = "";
    }
  });

  function compose(): string {
    const lines: string[] = [];
    if (mode === "quote") lines.push(en ? "Quote request" : "Demande de devis");
    if (slotLabel) lines.push((en ? "Preferred slot: " : "Créneau souhaité : ") + slotLabel.replace("|", " "));
    if (text.trim()) lines.push(text.trim());
    return lines.join("\n");
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    sending = true;
    error = null;
    try {
      if (mode === "quote") {
        const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
        if (needsContact && (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim()) || digits.length < 6)) {
          error = en ? "Please fill in your first name, a valid email and a valid phone number." : "Renseignez votre prénom, un e-mail valide et un numéro de téléphone valide.";
          return;
        }
        await createQuote({
          vendor_id: vendorId,
          message: text.trim(),
          slot_label: slotLabel,
          ...(needsContact ? { name: name.trim(), email: email.trim(), phone: `+${countryCode}${digits}` } : {}),
        });
        done = { status: "new", quote: true };
        snackbar.success(en ? "Quote request sent." : "Demande de devis envoyée.");
        return;
      }
      const res = await createContactRequest(vendorId, compose());
      done = { status: res.status, quote: false };
      snackbar.success(en ? "Request sent." : "Message envoyé.");
    } catch (e) {
      error = (e as Error).message;
      snackbar.error(error);
    } finally {
      sending = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") open = false;
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="qm-backdrop" role="presentation" onclick={() => (open = false)}></div>
  <div class="qm" role="dialog" aria-modal="true" aria-label={mode === "quote" ? (en ? "Request a quote" : "Demander un devis") : en ? "Write" : "Écrire"}>
    <button type="button" class="qm-close" aria-label="Fermer" onclick={() => (open = false)}><X size={18} /></button>
    <h3>{mode === "quote" ? (en ? "Request a quote" : "Demander un devis") : en ? "Write to" : "Écrire à"} {vendorName}</h3>

    {#if done}
      <p class="qm-ok">
        {#if done.quote}
          {en ? "Quote request sent. Our team will get back to you by email." : "Demande de devis envoyée. Notre équipe vous répond par e-mail."}
        {:else if done.status === "approved"}
          {en ? "Your request is already approved: you can chat with the provider." : "Votre demande est déjà validée : vous pouvez échanger avec le prestataire."}
        {:else}
          {en ? "Request sent. It will be forwarded to the provider after a quick review." : "Demande envoyée. Elle sera transmise au prestataire après une rapide validation."}
        {/if}
      </p>
      <div class="qm-actions">
        {#if !done.quote}<a class="qm-btn qm-yellow" href="/client/messagerie">{en ? "My requests" : "Mes demandes"}</a>{/if}
        <button type="button" class="qm-btn" class:qm-yellow={done.quote} class:qm-outline={!done.quote} onclick={() => (open = false)}>{en ? "Close" : "Fermer"}</button>
      </div>
    {:else if mode === "message" && !auth.role}
      <p>{en ? "Sign in to contact this provider. It only takes a minute." : "Connectez-vous pour contacter ce prestataire. Cela prend une minute."}</p>
      <div class="qm-actions">
        <a class="qm-btn qm-yellow" href="/client/login?redirect={redirect}">{en ? "Sign in" : "Se connecter"}</a>
        <a class="qm-btn qm-outline" href="/client/register?redirect={redirect}">{en ? "Create an account" : "Créer un compte"}</a>
      </div>
    {:else if mode === "message" && !isClient}
      <p>{en ? "Please use a customer account to contact providers." : "Utilisez un compte client pour contacter les prestataires."}</p>
      <div class="qm-actions"><a class="qm-btn qm-yellow" href="/client/login?redirect={redirect}">{en ? "Customer sign in" : "Connexion client"}</a></div>
    {:else}
      <form onsubmit={submit}>
        {#if slotLabel}<p class="qm-slot">{en ? "Preferred slot" : "Créneau souhaité"} : <strong>{slotLabel.replace("|", " ")}</strong></p>{/if}
        {#if needsContact}
          <label for="qm-name">{en ? "First name" : "Prénoms"}</label>
          <input id="qm-name" type="text" bind:value={name} required minlength="2" maxlength="160" autocomplete="given-name" placeholder={en ? "E.g. Kodjo Mawuli" : "Ex. Kodjo Mawuli"} />
          <PhoneField bind:countryCode bind:phone label={en ? "Phone" : "Téléphone"} id="qm-phone" />
          <label for="qm-email">Email</label>
          <input id="qm-email" type="email" bind:value={email} required maxlength="255" autocomplete="email" placeholder={en ? "you@example.com" : "vous@exemple.com"} />
        {:else if mode === "quote"}
          <p class="qm-slot">{en ? "Your account details will be used to answer you." : "Les informations de votre compte seront utilisées pour vous répondre."}</p>
        {/if}
        <label for="qm-text">{mode === "quote" ? (en ? "Describe your need" : "Décrivez votre besoin") : en ? "Your message" : "Votre message"}</label>
        <textarea id="qm-text" rows="5" bind:value={text} required placeholder={en ? "E.g. my kitchen tap has been leaking since yesterday…" : "Ex : mon robinet de cuisine fuit depuis hier…"}></textarea>
        {#if error}<p class="qm-error">{error}</p>{/if}
        <div class="qm-actions">
          <button type="submit" class="qm-btn qm-yellow" disabled={sending} aria-busy={sending}>{#if sending}<Spinner />{/if}{sending ? (en ? "Sending…" : "Envoi…") : en ? "Send" : "Envoyer"}</button>
          <button type="button" class="qm-btn qm-outline" onclick={() => (open = false)}>{en ? "Cancel" : "Annuler"}</button>
        </div>
      </form>
    {/if}
  </div>
{/if}

<style>
  .qm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 32, 0.5);
    z-index: 60;
  }
  .qm {
    position: fixed;
    z-index: 61;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(32rem, calc(100% - 2rem));
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    background: #fff;
    border-radius: 20px;
    padding: 1.6rem 1.5rem 1.4rem;
    box-shadow: 0 24px 60px rgba(15, 23, 32, 0.35);
    font-family: "Figtree", system-ui, sans-serif;
    color: #1b2620;
  }
  .qm h3 {
    margin: 0 2rem 0.9rem 0;
    font-size: 1.15rem;
  }
  .qm p {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: #46524b;
  }
  .qm-close {
    position: absolute;
    right: 0.9rem;
    top: 0.9rem;
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 8px;
  }
  .qm form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    max-width: none;
  }
  .qm label {
    font-size: 0.82rem;
    font-weight: 700;
  }
  .qm input[type="text"],
  .qm input[type="email"] {
    width: 100%;
    border: 1.5px solid #e4dcc0;
    border-radius: 12px;
    padding: 0.65rem 0.8rem;
    font: inherit;
    font-size: 0.9rem;
  }
  .qm textarea {
    width: 100%;
    border: 1.5px solid #e4dcc0;
    border-radius: 12px;
    padding: 0.7rem 0.8rem;
    font: inherit;
    font-size: 0.9rem;
  }
  .qm-slot {
    margin: 0 !important;
  }
  .qm-error {
    color: #dc2626 !important;
    margin: 0 !important;
  }
  .qm-ok {
    color: #0a5a2e !important;
    font-weight: 600;
  }
  .qm-actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  .qm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 0.7rem 1.1rem;
    font: inherit;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    text-decoration: none;
    border: 1.5px solid transparent;
    color: #1b2620;
    gap: 0.45rem;
  }
  .qm-btn:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  .qm-btn:hover {
    filter: brightness(0.96);
    text-decoration: none;
  }
  .qm-yellow {
    background: #ffc629;
  }
  .qm-outline {
    background: #fff;
    border-color: #1b2620;
  }
</style>
