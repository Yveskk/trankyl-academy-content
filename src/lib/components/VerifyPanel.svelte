<script lang="ts">
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import MessageSquareText from "@lucide/svelte/icons/message-square-text";
  import Mail from "@lucide/svelte/icons/mail";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { Channel } from "$lib/api/auth";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { VerificationFlow } from "$lib/utils/verificationFlow.svelte";
  import Btn from "./Btn.svelte";

  let {
    flow,
    context = "",
    trustOption = false,
    trustDefault = false,
    backLabel = "",
    onback,
  }: {
    flow: VerificationFlow<any>;
    /** Ligne d'en-tete (ex. le nom du compte), comme "Yves K. • Trankyl". */
    context?: string;
    /** Affiche "Faire confiance a cet appareil". */
    trustOption?: boolean;
    trustDefault?: boolean;
    backLabel?: string;
    onback?: () => void;
  } = $props();

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  let ch = $derived(flow.challenge);
  let code = $state("");
  let trust = $state(false);
  let showAlternatives = $state(false);
  let inputEl = $state<HTMLInputElement | undefined>();

  // Nouvelle demande : on repart d'un champ vide et du bon etat des options.
  $effect(() => {
    void ch?.request_id;
    code = "";
    trust = trustDefault;
    showAlternatives = flow.suggestAlternatives;
    inputEl?.focus();
  });
  $effect(() => {
    if (flow.suggestAlternatives) showAlternatives = true;
  });

  // Compte a rebours avant de pouvoir demander un nouveau code.
  let now = $state(Date.now());
  $effect(() => {
    void ch?.sentAt;
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let wait = $derived(ch ? Math.max(0, ch.resend_in - Math.floor((now - ch.sentAt) / 1000)) : 0);
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const CODE_LENGTH = 6;
  let ready = $derived(code.length >= 4);

  function onInput(e: Event) {
    // Chiffres uniquement ; "123 456" copie depuis WhatsApp est accepte.
    code = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, "").slice(0, 8);
    (e.currentTarget as HTMLInputElement).value = code;
  }

  async function submit(e?: SubmitEvent) {
    e?.preventDefault();
    if (!ready || flow.busy) return;
    await flow.submit(code, trust);
    if (flow.error) {
      inputEl?.select();
    }
  }

  async function choose(channel: Channel) {
    const ok = await flow.resend(channel);
    if (ok) showAlternatives = false;
  }
  async function again() {
    if (wait > 0) return;
    await flow.resend();
  }

  const META: Record<Channel, { fr: [string, string]; en: [string, string]; label: string; hint: [string, string] }> = {
    whatsapp: { fr: ["Consultez vos messages WhatsApp", "Entrez le code que nous avons envoyé sur votre compte WhatsApp"], en: ["Check your WhatsApp messages", "Enter the code we sent to your WhatsApp account"], label: "WhatsApp", hint: ["Recevoir le code sur WhatsApp", "Get the code on WhatsApp"] },
    sms: { fr: ["Consultez vos SMS", "Entrez le code que nous avons envoyé par SMS au"], en: ["Check your text messages", "Enter the code we sent by text message to"], label: "SMS", hint: ["Recevoir le code par SMS", "Get the code by text message"] },
    email: { fr: ["Consultez votre boîte email", "Entrez le code que nous avons envoyé à l'adresse"], en: ["Check your inbox", "Enter the code we sent to"], label: "Email", hint: ["Recevoir le code par email", "Get the code by email"] },
  };
  let meta = $derived(ch ? META[ch.channel] : META.whatsapp);
  let alternatives = $derived((ch?.channels ?? []).filter((c) => c !== ch?.channel || flow.suggestAlternatives));
</script>

{#if ch}
  <div class="vp">
    {#if onback}
      <button type="button" class="vp-back" onclick={onback}><ArrowLeft size={16} /> {backLabel || t("Retour", "Back")}</button>
    {/if}

    {#if context}<p class="vp-context">{context}</p>{/if}
    <h1>{en ? meta.en[0] : meta.fr[0]}</h1>
    <p class="vp-sub">
      {en ? meta.en[1] : meta.fr[1]}{ch.destination_masked ? " :" : ""}
      {#if ch.destination_masked}<strong>{ch.destination_masked}</strong>{/if}.
      {#if ch.channel === "email"} {t("Pensez à vérifier vos courriers indésirables.", "Remember to check your spam folder.")}{/if}
    </p>

    <!-- Illustration (inline : aucune image a charger) -->
    <div class="vp-art" aria-hidden="true">
      <svg viewBox="0 0 600 262" role="presentation">
        <defs>
          <linearGradient id="vp-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffe3f1" />
            <stop offset="0.55" stop-color="#e9d9ff" />
            <stop offset="1" stop-color="#bcd3ff" />
          </linearGradient>
        </defs>
        <rect width="600" height="262" fill="url(#vp-bg)" />
        <rect x="205" y="38" width="190" height="260" rx="26" fill="#3c4b5d" />
        <rect x="213" y="48" width="174" height="250" rx="20" fill="#f6efe4" />
        <circle cx="236" cy="76" r="7" fill="#1b74e8" />
        <rect x="252" y="68" width="92" height="7" rx="3.5" fill="#cfd6e0" />
        <rect x="252" y="80" width="72" height="6" rx="3" fill="#dde2ea" />
        <rect x="226" y="108" width="148" height="46" rx="10" fill="#fff" />
        <text x="300" y="139" text-anchor="middle" font-size="26" font-weight="700" fill="#0f7d41" letter-spacing="6">******</text>
        {#if ch.channel === "whatsapp"}
          <circle cx="132" cy="118" r="48" fill="#25d366" />
          <path d="M132 92a26 26 0 0 0-22 39l-4 15 15-4a26 26 0 1 0 11-50Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
          <path d="M122 107c1 8 8 17 17 20l5-5-8-4-3 3c-3-1-7-5-8-9l3-3-4-8Z" fill="#fff" />
        {:else if ch.channel === "sms"}
          <rect x="84" y="84" width="96" height="68" rx="18" fill="#0f7d41" />
          <path d="M104 152v22l24-22Z" fill="#0f7d41" />
          <circle cx="112" cy="118" r="6" fill="#fff" /><circle cx="132" cy="118" r="6" fill="#fff" /><circle cx="152" cy="118" r="6" fill="#fff" />
        {:else}
          <rect x="84" y="90" width="104" height="72" rx="12" fill="#ffc629" />
          <path d="m88 98 48 38 48-38" fill="none" stroke="#1b2620" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        {/if}
        <circle cx="468" cy="96" r="22" fill="#fff" opacity="0.7" />
        <path d="M468 84l12 5v9c0 8-5 14-12 17-7-3-12-9-12-17v-9Z" fill="#0f7d41" />
        <path d="m462 98 5 5 9-10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <form onsubmit={submit} novalidate>
      <div class="vp-field" class:err={!!flow.error}>
        <label for="vp-code">{t("Code", "Code")}</label>
        <input
          id="vp-code"
          bind:this={inputEl}
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]*"
          maxlength={CODE_LENGTH + 2}
          value={code}
          oninput={onInput}
          aria-invalid={!!flow.error}
          aria-describedby="vp-msg"
          placeholder={"•".repeat(CODE_LENGTH)}
        />
      </div>
      <p id="vp-msg" class="vp-error" role="alert" aria-live="assertive">{flow.error ?? ""}</p>

      <p class="vp-resend">
        <RefreshCw size={16} aria-hidden="true" />
        <span>
          {t("L'envoi de ce code peut prendre quelques minutes.", "It can take a few minutes to receive this code.")}
          {#if wait > 0}
            <span class="vp-wait">{t("Nouveau code possible dans", "New code available in")} {clock(wait)}</span>
          {:else}
            <button type="button" class="vp-link" onclick={again} disabled={flow.busy}>{t("Recevoir un nouveau code", "Get a new code")}</button>
          {/if}
        </span>
      </p>

      {#if trustOption}
        <label class="vp-trust">
          <input type="checkbox" bind:checked={trust} />
          <span>{t("Faire confiance à cet appareil pendant 30 jours", "Trust this device for 30 days")}
            <small>{t("Ne cochez pas sur un ordinateur partagé.", "Do not tick on a shared computer.")}</small></span>
        </label>
      {/if}

      <Btn type="submit" class="vp-primary" disabled={!ready} loading={flow.busy}>{t("Continuer", "Continue")}</Btn>

      {#if alternatives.length > 0}
        <button type="button" class="vp-secondary" aria-expanded={showAlternatives} onclick={() => (showAlternatives = !showAlternatives)} disabled={flow.busy}>
          {t("Essayer d'une autre façon", "Try another way")}
        </button>
        {#if showAlternatives}
          <ul class="vp-alt" aria-label={t("Autres canaux", "Other options")}>
            {#each alternatives as c}
              <li>
                <button type="button" onclick={() => choose(c)} disabled={flow.busy}>
                  <span class="vp-alt-ico {c}">
                    {#if c === "email"}<Mail size={18} />{:else if c === "sms"}<MessageSquareText size={18} />{:else}<ShieldCheck size={18} />{/if}
                  </span>
                  <span>
                    <strong>{META[c].label}</strong>
                    <small>{en ? META[c].hint[1] : META[c].hint[0]}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </form>

    <p class="vp-safe"><ShieldCheck size={14} aria-hidden="true" /> {t("Ne partagez jamais ce code. Trankyl ne vous le demandera jamais, par message ou par téléphone.", "Never share this code. Trankyl will never ask for it by message or phone.")}</p>
  </div>
{/if}

<style>
  .vp {
    width: 100%;
    max-width: 30rem;
    margin-inline: auto;
    font-family: var(--font-sans);
  }
  .vp h1 {
    font-size: 1.55rem;
    margin: 0.2rem 0 0.5rem;
    letter-spacing: -0.01em;
  }
  .vp-back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: none;
    padding: 0.2rem 0;
    margin-bottom: 0.8rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .vp-back:hover {
    color: var(--green-dark);
  }
  .vp-context {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .vp-sub {
    margin: 0 0 1.1rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ink);
  }
  .vp-art {
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 1.3rem;
    line-height: 0;
  }
  .vp-art svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .vp form {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: none;
  }
  .vp-field {
    position: relative;
    border: 1.5px solid #c7ccd1;
    border-radius: 16px;
    padding: 0.55rem 1rem 0.5rem;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .vp-field:focus-within {
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(3, 167, 26, 0.14);
  }
  .vp-field.err {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }
  .vp-field label {
    display: block;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--muted);
  }
  .vp-field input {
    display: block;
    width: 100%;
    border: 0;
    padding: 0.1rem 0 0;
    background: transparent;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.35em;
    color: var(--ink);
    box-shadow: none;
    border-radius: 0;
  }
  .vp-field input:focus {
    outline: none;
    border: 0;
    box-shadow: none;
  }
  .vp-field input::placeholder {
    color: #c9ced3;
    font-weight: 400;
  }
  .vp-error {
    min-height: 1.4rem;
    margin: 0.35rem 0.2rem 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--danger);
  }
  .vp-resend {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    margin: 0.5rem 0 1rem;
    font-size: 0.88rem;
    color: var(--ink);
  }
  .vp-resend :global(svg) {
    flex: none;
    margin-top: 0.15rem;
  }
  .vp-wait {
    display: block;
    color: var(--muted);
    font-weight: 600;
  }
  .vp-link {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 700;
    color: var(--green-dark);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .vp-link:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .vp-trust {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    margin: 0 0 1rem;
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
  }
  .vp-trust input {
    margin-top: 0.2rem;
  }
  .vp-trust small {
    display: block;
    font-weight: 400;
    color: var(--muted);
  }
  .vp :global(.vp-primary) {
    width: 100%;
    border-radius: 999px;
    padding: 0.85rem 1rem;
    font-size: 0.95rem;
    font-weight: 700;
    background: var(--gold);
    color: var(--ink);
    border: 0;
  }
  .vp :global(.vp-primary:hover:not(:disabled)) {
    filter: brightness(0.96);
  }
  .vp :global(.vp-primary:disabled) {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .vp-secondary {
    width: 100%;
    margin-top: 0.7rem;
    border: 0;
    border-radius: 999px;
    padding: 0.85rem 1rem;
    background: #eef0ee;
    color: var(--ink);
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
  }
  .vp-secondary:hover:not(:disabled) {
    background: #e3e6e3;
  }
  .vp-alt {
    list-style: none;
    margin: 0.7rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .vp-alt button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border: 1.5px solid var(--border);
    background: #fff;
    border-radius: 14px;
    padding: 0.7rem 0.9rem;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .vp-alt button:hover:not(:disabled) {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .vp-alt button > span:nth-child(2) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .vp-alt small {
    color: var(--muted);
    font-size: 0.78rem;
  }
  .vp-alt-ico {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--green);
  }
  .vp-alt-ico.whatsapp {
    background: #25d366;
  }
  .vp-alt-ico.sms {
    background: #0f7d41;
  }
  .vp-alt-ico.email {
    background: var(--gold);
    color: var(--ink);
  }
  .vp-safe {
    display: flex;
    gap: 0.4rem;
    align-items: flex-start;
    margin: 1.2rem 0 0;
    font-size: 0.76rem;
    color: var(--muted);
    line-height: 1.45;
  }
  .vp-safe :global(svg) {
    flex: none;
    margin-top: 0.1rem;
    color: var(--green-dark);
  }
</style>
