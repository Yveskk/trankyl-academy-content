<script lang="ts">
  import { adminChangePassword, adminMe, adminRegenerateRecoveryCodes } from "$lib/api/auth";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordStrength from "$lib/components/PasswordStrength.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Copy from "@lucide/svelte/icons/copy";
  import Download from "@lucide/svelte/icons/download";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";

  const pending = new Pending();
  let me = $derived(auth.admin);

  // changement de mot de passe : ancien mot de passe + code de l'application
  let current = $state("");
  let next = $state("");
  let confirm = $state("");
  let pwCode = $state("");

  async function changePassword(event: SubmitEvent) {
    event.preventDefault();
    if (next !== confirm) {
      snackbar.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    await pending.run("pw", async () => {
      try {
        const res = await adminChangePassword(current, next, pwCode.replace(/\s/g, ""));
        auth.login(res.access_token, "admin"); // les anciennes sessions sont fermees : on garde la nouvelle
        auth.admin = await adminMe();
        current = next = confirm = pwCode = "";
        snackbar.success(res.detail);
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  // codes de secours
  let regenOpen = $state(false);
  let regenCode = $state("");
  let codes = $state<string[]>([]);

  async function regenerate(event: SubmitEvent) {
    event.preventDefault();
    await pending.run("regen", async () => {
      try {
        codes = (await adminRegenerateRecoveryCodes(regenCode.replace(/\s/g, ""))).recovery_codes;
        regenOpen = false;
        regenCode = "";
        auth.admin = await adminMe();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      snackbar.success("Codes copiés.");
    } catch {
      snackbar.error("Copie impossible : sélectionnez les codes à la main.");
    }
  }
  function downloadCodes() {
    const url = URL.createObjectURL(new Blob([`Trankyl Academy - codes de secours (${me?.email})\nChaque code ne fonctionne qu'une fois.\n\n${codes.join("\n")}\n`], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: "trankyl-codes-de-secours.txt" }).click();
    URL.revokeObjectURL(url);
  }
</script>

{#if me}
  <div class="grid">
    <section class="card">
      <h3>Mon profil</h3>
      <dl>
        <dt>Nom</dt><dd>{me.firstname} {me.lastname ?? ""}</dd>
        <dt>Email</dt><dd>{me.email}</dd>
        <dt>Rôle</dt><dd>{me.is_super ? "Super-administrateur (accès total)" : (me.role?.name ?? "—")}</dd>
        <dt>Permissions</dt><dd>{me.is_super ? "Toutes" : me.permissions.length}</dd>
      </dl>
      <p class="hint">Pour changer votre nom, votre email ou votre rôle, adressez-vous à un administrateur.</p>
    </section>

    <section class="card">
      <h3><ShieldCheck size={17} /> Double authentification</h3>
      <p class="status ok">Activée</p>
      <p class="hint">Un code de votre application d'authentification est demandé à chaque connexion.</p>
      <p class="left" class:low={me.recovery_left <= 3}>
        <strong>{me.recovery_left}</strong> code{me.recovery_left > 1 ? "s" : ""} de secours restant{me.recovery_left > 1 ? "s" : ""}
      </p>
      <button type="button" class="btn btn-outline btn-sm" onclick={() => (regenOpen = true)}><KeyRound size={14} /> Générer de nouveaux codes de secours</button>
      <p class="hint">Les anciens codes cessent de fonctionner.</p>
    </section>

    <section class="card wide">
      <h3>Changer mon mot de passe</h3>
      <form onsubmit={changePassword}>
        <label>Mot de passe actuel<input type="password" autocomplete="current-password" bind:value={current} required /></label>
        <label>Nouveau mot de passe<input type="password" autocomplete="new-password" bind:value={next} required minlength="8" /></label>
        <PasswordStrength password={next} email={me.email} />
        <label>Confirmer le nouveau mot de passe<input type="password" autocomplete="new-password" bind:value={confirm} required /></label>
        <label>Code de votre application d'authentification<input class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" bind:value={pwCode} required /></label>
        <div><Btn type="submit" class="btn-primary" loading={pending.is("pw")} disabled={pwCode.replace(/\s/g, "").length < 6}>Changer le mot de passe</Btn></div>
      </form>
      <p class="hint">Vos autres sessions ouvertes seront déconnectées.</p>
    </section>
  </div>
{/if}

<Modal open={regenOpen} title="Nouveaux codes de secours" subtitle="Confirmez avec un code de votre application d'authentification." locked={pending.is("regen")} onclose={() => (regenOpen = false)}>
  <form id="regen" onsubmit={regenerate}>
    <label>Code à 6 chiffres<input class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" bind:value={regenCode} required /></label>
  </form>
  {#snippet footer()}
    <Btn class="btn-ghost" disabled={pending.is("regen")} onclick={() => (regenOpen = false)}>Annuler</Btn>
    <Btn type="submit" class="btn-primary" form="regen" loading={pending.is("regen")} disabled={regenCode.replace(/\s/g, "").length < 6}>Générer</Btn>
  {/snippet}
</Modal>

<Modal open={codes.length > 0} title="Vos nouveaux codes de secours" subtitle="Ils ne seront plus jamais affichés. Conservez-les en lieu sûr." locked={true} onclose={() => (codes = [])}>
  <div class="codes">{#each codes as c}<code>{c}</code>{/each}</div>
  <div class="row">
    <button type="button" class="btn btn-outline btn-sm" onclick={copyCodes}><Copy size={14} /> Copier</button>
    <button type="button" class="btn btn-outline btn-sm" onclick={downloadCodes}><Download size={14} /> Télécharger</button>
  </div>
  {#snippet footer()}<Btn class="btn-primary" onclick={() => (codes = [])}>J'ai enregistré mes codes</Btn>{/snippet}
</Modal>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: 1.1rem;
    align-items: start;
  }
  .wide {
    grid-column: 1 / -1;
    max-width: 34rem;
  }
  h3 {
    margin: 0 0 0.8rem;
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  dl {
    display: grid;
    grid-template-columns: 7rem 1fr;
    gap: 0.5rem 1rem;
    margin: 0;
    font-size: 0.88rem;
  }
  dt {
    color: var(--muted);
    font-weight: 600;
  }
  dd {
    margin: 0;
    word-break: break-word;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--muted);
    margin: 0.6rem 0 0;
  }
  .status.ok {
    display: inline-block;
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: #e2f3e8;
    color: var(--green-deep);
  }
  .left {
    margin: 0.9rem 0 0.6rem;
    font-size: 0.9rem;
  }
  .left.low strong {
    color: var(--danger);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    max-width: none;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  input {
    width: 100%;
  }
  .otp {
    font-family: ui-monospace, monospace;
    font-size: 1.15rem;
    letter-spacing: 0.3em;
    text-align: center;
    max-width: 12rem;
    font-weight: 700;
  }
  .codes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.9rem;
    background: #fff9e3;
    border: 1px dashed #e0c25b;
    border-radius: 12px;
    margin-bottom: 0.8rem;
  }
  .codes code {
    font-family: ui-monospace, monospace;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: center;
    user-select: all;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
</style>
