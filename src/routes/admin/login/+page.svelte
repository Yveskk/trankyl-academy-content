<script lang="ts">
  import AuthShell from "$lib/components/AuthShell.svelte";
  import { onMount, untrack } from "svelte";
  import Shield from "@lucide/svelte/icons/shield";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import Smartphone from "@lucide/svelte/icons/smartphone";
  import Copy from "@lucide/svelte/icons/copy";
  import Download from "@lucide/svelte/icons/download";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
  import Layers from "@lucide/svelte/icons/layers";
  import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    adminChangeTempPassword,
    adminLogin,
    adminMe,
    adminMfaEnable,
    adminMfaSetup,
    adminMfaVerify,
    loginVerify,
    type AuthResult,
    type MfaSetup,
  } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PasswordStrength from "$lib/components/PasswordStrength.svelte";
  import QrCode from "$lib/components/QrCode.svelte";
  import VerifyPanel from "$lib/components/VerifyPanel.svelte";
  import { adminCountry } from "$lib/stores/adminCountry.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { firstAllowedPath } from "$lib/utils/adminNav";
  import { VerificationFlow } from "$lib/utils/verificationFlow.svelte";

  // Parcours : identifiants -> (code email, comptes historiques) -> (nouveau mot de passe, 1re connexion)
  //            -> configuration 2FA (1re connexion) | code de l'application (ensuite) -> codes de secours -> panneau
  type Stage = "credentials" | "change_password" | "mfa_setup" | "mfa_verify" | "recovery";

  let stage = $state<Stage>("credentials");
  let email = $state("");
  let password = $state("");
  let pre = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let expired = $derived($page.url.searchParams.get("expired") === "1");

  // change_password
  let newPassword = $state("");
  let confirmPassword = $state("");
  // mfa_setup
  let setup = $state<MfaSetup | null>(null);
  let setupError = $state<string | null>(null);
  let code = $state("");
  // mfa_verify
  let useRecovery = $state(false);
  let recoveryInput = $state("");
  // recovery
  let issuedToken = $state("");
  let recoveryCodes = $state<string[]>([]);
  let saved = $state(false);
  let leftWarning = $state<number | null>(null);

  // Toute erreur est annoncee dans un snackbar (untrack : le snackbar lit/ecrit sa propre liste).
  $effect(() => {
    const msg = error;
    if (msg) untrack(() => snackbar.error(msg));
  });
  $effect(() => {
    const msg = setupError;
    if (msg) untrack(() => snackbar.error(msg));
  });
  onMount(() => {
    if (expired) snackbar.error("Votre session a expiré ou votre accès a changé. Reconnectez-vous.");
  });

  const values = [
    { icon: Layers, text: "Taxonomie & curriculum" },
    { icon: BarChart3, text: "Suivi des apprenants et certifications" },
    { icon: LayoutDashboard, text: "Tableau de bord centralisé" },
  ];

  const flow = new VerificationFlow<AuthResult>({ verify: loginVerify, onSuccess: route });

  const spaced = (s: string) => s.replace(/(.{4})/g, "$1 ").trim();

  async function enter(token: string, left: number | null = null) {
    auth.login(token, "admin");
    try {
      auth.admin = await adminMe();
      adminCountry.ensure(auth.admin.id, auth.admin.countries.map((c) => c.code), auth.admin.default_country);
    } catch {
      auth.logout();
      error = "Impossible de charger votre profil. Réessayez.";
      stage = "credentials";
      return;
    }
    snackbar.success(left != null && left <= 3 ? `Connexion réussie. Il ne vous reste que ${left} code(s) de secours.` : "Connexion réussie.");
    await goto(firstAllowedPath((k) => auth.can(k)));
  }

  /** Aiguille selon la reponse du serveur. */
  async function route(res: AuthResult) {
    error = null;
    if (res.status === "ok" && res.access_token) {
      if (res.recovery_codes?.length) {
        issuedToken = res.access_token;
        recoveryCodes = res.recovery_codes;
        saved = false;
        stage = "recovery";
        return;
      }
      leftWarning = res.recovery_left ?? null;
      await enter(res.access_token, leftWarning);
      return;
    }
    if (!res.pre_token) return;
    pre = res.pre_token;
    code = "";
    useRecovery = false;
    recoveryInput = "";
    if (res.status === "change_password_required") stage = "change_password";
    else if (res.status === "mfa_required") stage = "mfa_verify";
    else if (res.status === "mfa_setup_required") {
      stage = "mfa_setup";
      await loadSetup();
    }
  }

  async function loadSetup() {
    setup = null;
    setupError = null;
    try {
      setup = await adminMfaSetup(pre);
    } catch (e) {
      setupError = (e as Error).message;
    }
  }

  function back() {
    flow.reset();
    stage = "credentials";
    password = "";
    pre = "";
    error = null;
  }

  async function run(fn: () => Promise<void>) {
    error = null;
    loading = true;
    try {
      await fn();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function submitCredentials(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    loading = true;
    try {
      const res = await adminLogin(email, password);
      if (!flow.begin(res)) await route(res);
    } catch (e) {
      error = flow.fail(e);
      if (flow.challenge) error = null;
    } finally {
      loading = false;
    }
  }

  const submitNewPassword = (event: SubmitEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      error = "Les deux mots de passe ne correspondent pas.";
      return;
    }
    return run(async () => route(await adminChangeTempPassword(pre, newPassword)));
  };

  const submitEnable = (event: SubmitEvent) => {
    event.preventDefault();
    return run(async () => route(await adminMfaEnable(pre, code.replace(/\s/g, ""))));
  };

  const submitVerify = (event: SubmitEvent) => {
    event.preventDefault();
    return run(async () => route(await adminMfaVerify(pre, useRecovery ? { recovery_code: recoveryInput.trim() } : { code: code.replace(/\s/g, "") })));
  };

  // Les codes de secours sont montres UNE seule fois : copie / telechargement avant de continuer.
  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      snackbar.success("Codes copiés dans le presse-papiers.");
    } catch {
      snackbar.error("Copie impossible : sélectionnez les codes à la main.");
    }
  }
  function downloadCodes() {
    const text = `Trankyl Academy - codes de secours (${email})\nChaque code ne fonctionne qu'une fois.\n\n${recoveryCodes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "trankyl-codes-de-secours.txt" });
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<AuthShell variant="green" title="Espace administration" text="Gérez la taxonomie, le curriculum, les apprenants et le contenu de Trankyl Academy." {values}>

    {#if flow.challenge}
      <VerifyPanel {flow} context="Administration Trankyl Academy · Vérification de votre adresse email" backLabel="Modifier mes informations" onback={back} />

    {:else if stage === "credentials"}
      <span class="icon-badge"><Shield size={22} /></span>
      <h1>Administration</h1>
      <p class="muted">Connectez-vous pour accéder au panneau de gestion.</p>

      <form onsubmit={submitCredentials}>
        <div class="field">
          <label for="email">Adresse email</label>
          <input id="email" type="email" autocomplete="username" placeholder="email" bind:value={email} required />
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <PasswordInput bind:value={password} id="password" autocomplete="current-password" />
        </div>
        <Btn type="submit" class="btn-primary" {loading}>{loading ? "Connexion..." : "Se connecter"}</Btn>
      </form>
      <p class="form-footer muted"><a href="/mot-de-passe-oublie?role=admin">Mot de passe oublié ?</a></p>
      <p class="form-footer muted"><a href="/">← Retour au site public</a></p>

    {:else if stage === "change_password"}
      <span class="icon-badge"><KeyRound size={22} /></span>
      <h1>Choisissez votre mot de passe</h1>
      <p class="muted">Votre compte vient d'être créé avec un mot de passe temporaire. Définissez-en un personnel, que vous seul connaîtrez.</p>
      <form onsubmit={submitNewPassword}>
        <div class="field">
          <label for="np">Nouveau mot de passe</label>
          <PasswordInput bind:value={newPassword} id="np" autocomplete="new-password" minlength={8} />
          <PasswordStrength password={newPassword} {email} />
        </div>
        <div class="field">
          <label for="cp">Confirmer le mot de passe</label>
          <PasswordInput bind:value={confirmPassword} id="cp" autocomplete="new-password" />
        </div>
        <Btn type="submit" class="btn-primary" {loading}>Continuer</Btn>
      </form>
      <p class="form-footer"><button type="button" class="linkish" onclick={back}><ArrowLeft size={14} /> Annuler</button></p>

    {:else if stage === "mfa_setup"}
      <span class="icon-badge"><Smartphone size={22} /></span>
      <h1>Activez la double authentification</h1>
      <p class="muted">Obligatoire pour accéder à l'administration. À chaque connexion, un code à 6 chiffres généré sur votre téléphone sera demandé en plus du mot de passe.</p>

      <ol class="steps">
        <li>
          <strong>Installez une application d'authentification</strong>
          <span>Google Authenticator, Microsoft Authenticator, Authy, 1Password…</span>
        </li>
        <li>
          <strong>Scannez ce QR code</strong>
          {#if setup}
            <div class="qr-row">
              <QrCode value={setup.otpauth_uri} size={168} label="QR code de configuration" />
              <div class="manual">
                <span>Impossible de scanner ? Saisissez cette clé :</span>
                <code>{spaced(setup.secret)}</code>
                <small>Compte : {setup.account} · codes à {setup.digits} chiffres, renouvelés toutes les {setup.period} s</small>
              </div>
            </div>
          {:else if setupError}
            <p class="alert alert-error">{setupError} <button type="button" class="linkish" onclick={loadSetup}>Réessayer</button></p>
          {:else}
            <span class="muted">Préparation…</span>
          {/if}
        </li>
        <li>
          <strong>Saisissez le code affiché pour confirmer</strong>
          <form onsubmit={submitEnable} class="code-form">
            <input class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" bind:value={code} required aria-label="Code à 6 chiffres" />
            <Btn type="submit" class="btn-primary" {loading} disabled={!setup || code.replace(/\s/g, "").length < 6}>Activer</Btn>
          </form>
        </li>
      </ol>
      <p class="form-footer"><button type="button" class="linkish" onclick={back}><ArrowLeft size={14} /> Annuler</button></p>

    {:else if stage === "mfa_verify"}
      <span class="icon-badge"><ShieldCheck size={22} /></span>
      <h1>Vérification en deux étapes</h1>
      {#if !useRecovery}
        <p class="muted">Ouvrez votre application d'authentification et saisissez le code à 6 chiffres de <strong>Trankyl Academy</strong>.</p>
        <form onsubmit={submitVerify}>
          <div class="field">
            <label for="otp">Code de l'application</label>
            <input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" bind:value={code} required />
          </div>
          <Btn type="submit" class="btn-primary" {loading} disabled={code.replace(/\s/g, "").length < 6}>Vérifier</Btn>
        </form>
        <p class="form-footer"><button type="button" class="linkish" onclick={() => { useRecovery = true; error = null; }}>Téléphone perdu ? Utiliser un code de secours</button></p>
      {:else}
        <p class="muted">Saisissez l'un de vos codes de secours. Chaque code ne fonctionne <strong>qu'une seule fois</strong>.</p>
        <form onsubmit={submitVerify}>
          <div class="field">
            <label for="rc">Code de secours</label>
            <input id="rc" class="otp recovery" autocomplete="off" placeholder="XXXXX-XXXXX" bind:value={recoveryInput} required />
          </div>
          <Btn type="submit" class="btn-primary" {loading} disabled={recoveryInput.trim().length < 8}>Valider</Btn>
        </form>
        <p class="form-footer"><button type="button" class="linkish" onclick={() => { useRecovery = false; error = null; }}>Utiliser l'application d'authentification</button></p>
        <p class="hint">Plus de codes de secours ni de téléphone ? Un administrateur peut réinitialiser votre double authentification.</p>
      {/if}
      <p class="form-footer"><button type="button" class="linkish" onclick={back}><ArrowLeft size={14} /> Changer de compte</button></p>

    {:else if stage === "recovery"}
      <span class="icon-badge ok"><ShieldCheck size={22} /></span>
      <h1>Double authentification activée</h1>
      <p class="muted">Voici vos <strong>codes de secours</strong>. Si vous perdez votre téléphone, chacun vous permet de vous connecter une fois. <strong>Ils ne seront plus jamais affichés.</strong> Conservez-les dans un endroit sûr (gestionnaire de mots de passe, coffre).</p>
      <div class="codes" aria-label="Codes de secours">
        {#each recoveryCodes as c}<code>{c}</code>{/each}
      </div>
      <div class="code-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick={copyCodes}><Copy size={14} /> Copier</button>
        <button type="button" class="btn btn-outline btn-sm" onclick={downloadCodes}><Download size={14} /> Télécharger</button>
      </div>
      <label class="ack"><input type="checkbox" bind:checked={saved} /> J'ai enregistré mes codes de secours en lieu sûr</label>
      <Btn class="btn-primary" disabled={!saved} {loading} onclick={() => run(() => enter(issuedToken))}>Accéder à l'administration</Btn>
    {/if}
</AuthShell>
<style>



  .icon-badge.ok {
    background: #e2f3e8;
    color: var(--green-deep, #04330d);
  }
  .steps {
    list-style: none;
    margin: 1.1rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    counter-reset: s;
  }
  .steps li {
    position: relative;
    padding-left: 2.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    counter-increment: s;
  }
  .steps li::before {
    content: counter(s);
    position: absolute;
    left: 0;
    top: 0;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--green-deep, #04330d);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 800;
    display: grid;
    place-items: center;
  }
  .steps li > span {
    font-size: 0.82rem;
    color: var(--muted, #6b7280);
  }
  .qr-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .manual {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    min-width: 0;
    flex: 1 1 12rem;
  }
  .manual code {
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    background: #f5f6f4;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    word-break: break-all;
    user-select: all;
  }
  .manual small {
    color: var(--muted, #6b7280);
  }
  .code-form {
    display: flex;
    gap: 0.6rem;
    align-items: stretch;
  }
  .otp {
    font-size: 1.3rem;
    letter-spacing: 0.35em;
    text-align: center;
    font-family: ui-monospace, monospace;
    font-weight: 700;
    width: 100%;
  }
  .code-form .otp {
    max-width: 11rem;
  }
  .otp.recovery {
    letter-spacing: 0.12em;
    font-size: 1.05rem;
    text-transform: uppercase;
  }
  .codes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 1rem 0 0.7rem;
    padding: 0.9rem;
    background: #fff9e3;
    border: 1px dashed #e0c25b;
    border-radius: 12px;
  }
  .codes code {
    font-family: ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    text-align: center;
    user-select: all;
  }
  .code-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .ack {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }
  .linkish {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.85rem;
    color: var(--green-deep, #04330d);
    text-decoration: underline;
    cursor: pointer;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--muted, #6b7280);
  }
</style>
