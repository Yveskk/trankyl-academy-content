<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Check from "@lucide/svelte/icons/check";
  import Mail from "@lucide/svelte/icons/mail";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import MessageSquareText from "@lucide/svelte/icons/message-square-text";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { signupCheck, signupStart, signupVerify, type AuthResult, type Channel, type SignupChecked, type SignupPayload } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PasswordStrength from "$lib/components/PasswordStrength.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import VerifyPanel from "$lib/components/VerifyPanel.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { VerificationFlow } from "$lib/utils/verificationFlow.svelte";

  // Inscription en 3 ecrans : (1) informations -> (2) choix du canal de reception du code -> (3) saisie du code.
  // Rien n'est envoye tant que l'utilisateur n'a pas choisi le canal ; aucun compte n'existe avant la saisie du code.
  let {
    profile,
    cta,
    haveAccount,
    signIn,
    loginHref,
    onsuccess,
    step = $bindable("info"),
  }: {
    profile: "apprenant" | "prestataire" | "client";
    cta: string;
    haveAccount: string;
    signIn: string;
    loginHref: string;
    onsuccess: (res: AuthResult) => void | Promise<void>;
    /** Ecran courant (lie, pour que la page n'affiche son titre qu'au premier ecran). */
    step?: "info" | "channel" | "code";
  } = $props();

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const emailRequired = $derived(profile === "client");


  // ecran 1
  let firstname = $state("");
  let email = $state("");
  let countryCode = $state("228");
  let phone = $state("");
  let password = $state("");
  let hp = $state(""); // champ piege : un humain ne le voit jamais
  const startedAt = Date.now();
  let touched = $state(false);
  let busy = $state(false);

  // ecran 2
  let checked = $state<SignupChecked | null>(null);
  let channel = $state<Channel>("whatsapp");

  const flow = new VerificationFlow<AuthResult>({ verify: signupVerify, onSuccess: (r) => onsuccess(r) });
  // le flux passe a l'ecran 3 des qu'un code est en attente, et revient a l'ecran 2 s'il est annule
  $effect(() => {
    if (flow.challenge) step = "code";
  });
  // le mot de passe ne reste pas en memoire une fois la page quittee
  $effect(() => () => {
    password = "";
  });

  const fullPhone = $derived(`+${countryCode}${phone.replace(/\D/g, "")}`);
  const emailOk = $derived(!email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()));
  const errors = $derived({
    firstname: touched && !firstname.trim() ? t("Indiquez votre prénom.", "Enter your first name.") : "",
    email: touched && ((emailRequired && !email.trim()) || !emailOk) ? (emailRequired && !email.trim() ? t("L'email est obligatoire.", "Email is required.") : t("Adresse email invalide.", "Invalid email address.")) : "",
    phone: touched && phone.replace(/\D/g, "").length < 6 ? t("Numéro de téléphone invalide.", "Invalid phone number.") : "",
    password: touched && password.length < 8 ? t("8 caractères minimum.", "At least 8 characters.") : "",
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));

  function payload(extra: Partial<SignupPayload> = {}): SignupPayload {
    return {
      role: profile,
      firstname: firstname.trim(),
      email: email.trim() || null,
      password,
      phone: fullPhone,
      lang: i18n.locale,
      hp,
      elapsed_ms: Date.now() - startedAt,
      ...extra,
    };
  }

  async function submitInfo(event: SubmitEvent) {
    event.preventDefault();
    touched = true;
    if (!firstname.trim() || (emailRequired && !email.trim()) || !emailOk || phone.replace(/\D/g, "").length < 6 || password.length < 8) {
      snackbar.error(t("Vérifiez les champs indiqués.", "Please check the highlighted fields."));
      return;
    }
    busy = true;
    try {
      checked = await signupCheck(payload());
      channel = checked.recommended;
      step = "channel";
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      busy = false;
    }
  }

  async function sendCode(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      const res = await signupStart(payload({ channel }));
      if (!flow.begin(res)) snackbar.error(t("Réponse inattendue du serveur.", "Unexpected server response."));
    } catch (e) {
      const message = flow.fail(e);
      if (!flow.challenge) snackbar.error(message);
    } finally {
      busy = false;
    }
  }

  const CHANNELS: Record<Channel, { name: string; hint: [string, string]; icon: typeof Mail }> = {
    whatsapp: { name: "WhatsApp", hint: ["Instantané et gratuit", "Instant and free"], icon: MessageCircle },
    sms: { name: "SMS", hint: ["Fonctionne sans internet", "Works without internet"], icon: MessageSquareText },
    email: { name: "Email", hint: ["Dans votre boîte de réception", "In your inbox"], icon: Mail },
  };
</script>

{#key step}
  <div class="step">
    {#if step === "info"}
      <form onsubmit={submitInfo} novalidate>
        <div class="field">
          <label for="firstname">{t("Prénoms", "First names")}</label>
          <input id="firstname" bind:value={firstname} required maxlength="100" autocomplete="given-name" aria-invalid={errors.firstname ? true : undefined} placeholder={t("Ex. Kodjo Mawuli", "E.g. Kodjo Mawuli")} />
          {#if errors.firstname}<p class="field-error" role="alert">{errors.firstname}</p>{/if}
        </div>

        <div class="field">
          <label for="email">Email {#if !emailRequired}<span class="opt">({t("facultatif", "optional")})</span>{/if}</label>
          <input id="email" type="email" bind:value={email} required={emailRequired} maxlength="190" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" aria-invalid={errors.email ? true : undefined} placeholder="vous@exemple.com" />
          {#if errors.email}<p class="field-error" role="alert">{errors.email}</p>
          {:else if !emailRequired}<p class="hint">{t("Pour recevoir votre code par email et récupérer votre compte plus facilement.", "To receive your code by email and recover your account more easily.")}</p>{/if}
        </div>

        <div class="field">
          <PhoneField bind:countryCode bind:phone label={t("Téléphone", "Phone")} invalid={!!errors.phone} />
          {#if errors.phone}<p class="field-error" role="alert">{errors.phone}</p>{/if}
        </div>

        <div class="field">
          <label for="password">{t("Mot de passe", "Password")}</label>
          <PasswordInput bind:value={password} id="password" autocomplete="new-password" invalid={!!errors.password} minlength={8} />
          {#if errors.password}<p class="field-error" role="alert">{errors.password}</p>{/if}
          <PasswordStrength {password} {email} phone={fullPhone} />
        </div>

        <!-- piege anti-robots : invisible pour un humain, rempli par un robot -->
        <div class="hp" aria-hidden="true">
          <label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off" bind:value={hp} /></label>
        </div>

        <Btn type="submit" class="btn-gold" loading={busy}>{busy ? t("Vérification…", "Checking…") : t("Continuer", "Continue")}</Btn>
        <p class="secure"><ShieldCheck size={14} /> {t("Vos informations sont chiffrées et ne sont jamais revendues.", "Your details are encrypted and never sold.")}</p>
      </form>
      <p class="form-footer muted">{haveAccount} <a href={loginHref}>{signIn}</a></p>
    {:else if step === "channel" && checked}
      <button type="button" class="back" onclick={() => (step = "info")}><ArrowLeft size={15} /> {t("Modifier mes informations", "Edit my details")}</button>
      <h2>{t("Comment souhaitez-vous recevoir votre code ?", "How would you like to receive your code?")}</h2>
      <p class="muted lead">{t("Un code à 6 chiffres confirme que ce contact est bien le vôtre. Rien n'est envoyé avant votre confirmation.", "A 6-digit code confirms this contact is yours. Nothing is sent before you confirm.")}</p>

      <form onsubmit={sendCode}>
        <div class="channels" role="radiogroup" aria-label={t("Canal de réception", "Delivery channel")}>
          {#each checked.channels as c (c)}
            {@const meta = CHANNELS[c]}
            {@const Icon = meta.icon}
            <label class="opt-card" class:on={channel === c}>
              <input type="radio" name="channel" value={c} bind:group={channel} />
              <span class="ico {c}"><Icon size={22} /></span>
              <span class="txt">
                <strong>{meta.name}{#if c === checked.recommended}<em>{t("Recommandé", "Recommended")}</em>{/if}</strong>
                <small>{checked.destinations[c]} · {en ? meta.hint[1] : meta.hint[0]}</small>
              </span>
              <span class="tick"><Check size={16} /></span>
            </label>
          {/each}
        </div>
        <Btn type="submit" class="btn-gold" loading={busy}>{busy ? t("Envoi du code…", "Sending code…") : t("Recevoir le code", "Send me the code")}</Btn>
      </form>
    {:else if step === "code"}
      <VerifyPanel
        {flow}
        trustOption
        trustDefault
        context={`Trankyl Academy · ${firstname}`.trim()}
        backLabel={t("Changer de canal", "Change channel")}
        onback={() => {
          flow.reset();
          step = "channel";
        }}
      />
    {/if}
  </div>
{/key}

<style>
  .step {
    animation: step-in 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  @keyframes step-in {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    max-width: none;
  }
  h2 {
    margin: 0.4rem 0 0.4rem;
    font-size: 1.5rem;
  }
  .lead {
    margin: 0 0 1.4rem;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: none;
    padding: 0.2rem 0;
    font: inherit;
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .back:hover {
    color: var(--green-deep);
  }
  .hp {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .secure {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    margin: -0.2rem 0 0;
    font-size: 0.76rem;
    color: var(--muted);
  }
  .channels {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .opt-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.9rem 1rem;
    border: 1.5px solid var(--field-border);
    border-radius: 14px;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s, background 0.18s;
  }
  .opt-card:hover {
    border-color: var(--field-border-hover);
    transform: translateY(-1px);
  }
  .opt-card input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .opt-card:has(input:focus-visible) {
    outline: 3px solid var(--field-ring);
    outline-offset: 2px;
  }
  .opt-card.on {
    border-color: var(--green);
    background: var(--green-soft);
    box-shadow: 0 0 0 4px var(--field-ring);
  }
  .ico {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #f1f3ef;
    color: var(--ink-soft);
  }
  .ico.whatsapp {
    background: #dcf8e5;
    color: #128c4a;
  }
  .ico.sms {
    background: #e3ecff;
    color: #2a4fb0;
  }
  .ico.email {
    background: #fff1cc;
    color: #8a5300;
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1;
  }
  .txt strong {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.98rem;
  }
  .txt em {
    font-style: normal;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--green-deep);
    background: #c9f0d3;
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
  }
  .txt small {
    color: var(--muted);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }
  .tick {
    flex: none;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #cdd4cd;
    color: transparent;
    transition: all 0.2s;
  }
  .opt-card.on .tick {
    border-color: var(--green);
    background: var(--green);
    color: #fff;
  }
  @media (prefers-reduced-motion: reduce) {
    .step {
      animation: none;
    }
  }
</style>
