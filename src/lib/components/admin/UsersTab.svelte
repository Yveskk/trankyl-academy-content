<script lang="ts">
  import { onMount } from "svelte";
  import {
    createUser,
    listRoles,
    listUsers,
    reactivateUser,
    resetUserMfa,
    resetUserPassword,
    suspendUser,
    updateUser,
    userEvents,
    type AdminUserRow,
    type Invitation,
    type Role,
    type UserEvent,
  } from "$lib/api/access";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { adminCountry } from "$lib/stores/adminCountry.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Ban from "@lucide/svelte/icons/ban";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Copy from "@lucide/svelte/icons/copy";
  import History from "@lucide/svelte/icons/history";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import ShieldOff from "@lucide/svelte/icons/shield-off";

  let { refreshKey = 0 }: { refreshKey?: number } = $props();

  const pending = new Pending();
  let users = $state<AdminUserRow[]>([]);
  let roles = $state<Role[]>([]);
  let loading = $state(true);
  let q = $state("");
  let status = $state("");
  let roleFilter = $state(0);

  let canCreate = $derived(auth.can("academy.users.create"));
  let canEdit = $derived(auth.can("academy.users.edit"));
  let canSuspend = $derived(auth.can("academy.users.suspend"));
  let canReset = $derived(auth.can("academy.users.reset"));
  const me = $derived(auth.admin?.id);

  async function load() {
    loading = true;
    try {
      users = await listUsers(q.trim(), status, roleFilter || undefined);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  async function loadRoles() {
    try {
      roles = await listRoles();
    } catch {
      roles = [];
    }
  }
  onMount(() => {
    load();
    loadRoles();
  });
  // Les roles ont change (onglet voisin) : on relit la liste des roles et des comptes.
  $effect(() => {
    if (refreshKey > 0) {
      load();
      loadRoles();
    }
  });
  // Recherche : on attend une courte pause de frappe.
  let timer: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  }

  // Roles attribuables : donnant acces au panneau, et pas plus puissants que le sien.
  let assignable = $derived(
    roles.filter((r) => (r.is_super ? auth.admin?.is_super : r.permissions.every((p) => auth.can(p))) && (r.is_super || r.permissions.length > 0))
  );
  const roleName = (id: number | null) => roles.find((r) => r.id === id)?.name ?? "—";

  const fmt = (iso: string | null) => (iso ? new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Jamais");

  // ------------------------------------------------------------------ creation / edition
  let editing = $state<AdminUserRow | "new" | null>(null);
  let f = $state({ firstname: "", lastname: "", email: "", role_id: 0, countries: [] as string[], all_countries: false });
  // Pays attribuables : ceux auxquels on a soi-meme acces (le serveur refuse tout elargissement).
  let grantable = $derived(auth.admin?.countries ?? []);
  let canGrantAll = $derived(!!auth.admin?.all_countries);
  const nameOf = (code: string) => grantable.find((c) => c.code === code)?.name ?? code;
  function toggleCountry(code: string, on: boolean) {
    f.countries = on ? [...new Set([...f.countries, code])] : f.countries.filter((c) => c !== code);
  }
  let invitation = $state<{ user: AdminUserRow; data: Invitation; reset: boolean } | null>(null);

  function openNew() {
    f = { firstname: "", lastname: "", email: "", role_id: assignable[0]?.id ?? 0, countries: adminCountry.code ? [adminCountry.code] : [], all_countries: false };
    editing = "new";
  }
  function openEdit(u: AdminUserRow) {
    f = { firstname: u.firstname, lastname: u.lastname ?? "", email: u.email, role_id: u.role_id ?? 0, countries: [...u.countries], all_countries: u.all_countries && !u.is_super };
    editing = u;
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!f.role_id) {
      snackbar.error("Choisissez un rôle.");
      return;
    }
    const role = roles.find((r) => r.id === f.role_id);
    if (!role?.is_super && !f.all_countries && f.countries.length === 0) {
      snackbar.error("Choisissez au moins un pays.");
      return;
    }
    await pending.run("save", async () => {
      try {
        if (editing === "new") {
          const res = await createUser({ firstname: f.firstname.trim(), lastname: f.lastname.trim(), email: f.email.trim(), role_id: f.role_id, countries: f.countries, all_countries: f.all_countries });
          editing = null;
          invitation = { user: res.user, data: res.invitation, reset: false };
          snackbar.success("Utilisateur créé.");
        } else if (editing) {
          await updateUser(editing.id, { firstname: f.firstname.trim(), lastname: f.lastname.trim(), role_id: f.role_id, countries: f.countries, all_countries: f.all_countries });
          editing = null;
          snackbar.success("Utilisateur modifié.");
        }
        await load();
        loadRoles();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  // ------------------------------------------------------------------ actions
  async function toggleStatus(u: AdminUserRow) {
    const suspending = u.status === "active";
    const done = await confirmDialog.ask({
      title: suspending ? `Suspendre ${u.firstname} ?` : `Réactiver ${u.firstname} ?`,
      message: suspending
        ? "Son accès est coupé immédiatement, y compris s'il est connecté. Vous pourrez le réactiver à tout moment."
        : "Il pourra de nouveau se connecter avec son mot de passe et sa double authentification.",
      confirmLabel: suspending ? "Suspendre" : "Réactiver",
      tone: suspending ? "danger" : "default",
      action: async () => {
        if (suspending) await suspendUser(u.id);
        else await reactivateUser(u.id);
        await load();
      },
    });
    if (done) snackbar.success(suspending ? "Compte suspendu." : "Compte réactivé.");
  }

  async function resetPassword(u: AdminUserRow) {
    let result: { user: AdminUserRow; invitation: Invitation } | null = null;
    const done = await confirmDialog.ask({
      title: `Réinitialiser le mot de passe de ${u.firstname} ?`,
      message: "Un mot de passe temporaire est généré et ses sessions ouvertes sont fermées. Il devra le changer à sa prochaine connexion.",
      confirmLabel: "Réinitialiser",
      tone: "danger",
      action: async () => {
        result = await resetUserPassword(u.id);
        await load();
      },
    });
    if (done && result) invitation = { user: (result as any).user, data: (result as any).invitation, reset: true };
  }

  async function resetMfa(u: AdminUserRow) {
    const done = await confirmDialog.ask({
      title: `Réinitialiser la double authentification de ${u.firstname} ?`,
      message: "À utiliser si son téléphone est perdu. Ses sessions sont fermées : il devra reconfigurer une application d'authentification à sa prochaine connexion.",
      confirmLabel: "Réinitialiser la 2FA",
      tone: "danger",
      action: async () => {
        await resetUserMfa(u.id);
        await load();
      },
    });
    if (done) snackbar.success("Double authentification réinitialisée.");
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      snackbar.success(`${what} copié.`);
    } catch {
      snackbar.error("Copie impossible : sélectionnez le texte à la main.");
    }
  }

  // ------------------------------------------------------------------ journal
  let journalFor = $state<AdminUserRow | null>(null);
  let events = $state<UserEvent[] | null>(null);
  const EVENT_LABELS: Record<string, string> = {
    login_ok: "Connexion réussie", login_failed: "Échec de connexion", login_refused: "Connexion refusée", account_locked: "Compte verrouillé",
    mfa_enabled: "2FA activée", mfa_recovery_used: "Code de secours utilisé", mfa_recovery_regenerated: "Codes de secours régénérés", password_changed: "Mot de passe changé",
    admin_user_created: "Compte créé", admin_user_updated: "Compte modifié", admin_user_suspended: "Compte suspendu", admin_user_reactivated: "Compte réactivé",
    admin_password_reset: "Mot de passe réinitialisé", admin_mfa_reset: "2FA réinitialisée", code_sent: "Code envoyé", code_verified: "Code vérifié",
  };
  async function openJournal(u: AdminUserRow) {
    journalFor = u;
    events = null;
    try {
      events = await userEvents(u.id);
    } catch (e) {
      snackbar.error((e as Error).message);
      events = [];
    }
  }
</script>

<div class="toolbar">
  <div class="search"><Search size={15} /><input type="search" placeholder="Rechercher un nom ou un email" bind:value={q} oninput={onSearch} aria-label="Rechercher" /></div>
  <select bind:value={status} onchange={load} aria-label="Filtrer par statut">
    <option value="">Tous les statuts</option>
    <option value="active">Actifs</option>
    <option value="suspended">Suspendus</option>
  </select>
  <select bind:value={roleFilter} onchange={load} aria-label="Filtrer par rôle">
    <option value={0}>Tous les rôles</option>
    {#each roles as r}<option value={r.id}>{r.name}</option>{/each}
  </select>
  {#if canCreate}<button type="button" class="btn btn-gold btn-sm new" onclick={openNew}><Plus size={14} /> Nouvel utilisateur</button>{/if}
</div>

{#if loading && users.length === 0}
  <div class="loading-state">Chargement...</div>
{:else if users.length === 0}
  <div class="card empty">Aucun utilisateur ne correspond.</div>
{:else}
  <div class="card tablewrap">
    <table>
      <thead>
        <tr><th>Utilisateur</th><th>Rôle</th><th>Pays</th><th>Statut</th><th>2FA</th><th>Dernière connexion</th><th class="r">Actions</th></tr>
      </thead>
      <tbody>
        {#each users as u (u.id)}
          {@const self = u.id === me}
          <tr class:off={u.status === "suspended"}>
            <td data-l="Utilisateur">
              <div class="who">
                <span class="av">{(u.firstname[0] ?? "?").toUpperCase()}</span>
                <div><strong>{u.firstname} {u.lastname ?? ""}{#if self}&nbsp;<em>(vous)</em>{/if}</strong><small>{u.email}</small></div>
              </div>
            </td>
            <td data-l="Rôle"><span class="chip role" class:super={u.is_super}>{u.role_name ?? "—"}</span>{#if !u.has_access}<small class="warn">sans accès Academy</small>{/if}</td>
            <td data-l="Pays">
              {#if u.all_countries}<span class="chip all">Tous</span>{:else}{#each u.countries as c}<span class="chip cty" title={nameOf(c)}>{c}</span>{/each}{/if}
            </td>
            <td data-l="Statut">
              {#if u.status === "suspended"}<span class="chip bad">Suspendu</span>
              {:else if u.locked}<span class="chip warn">Verrouillé</span>
              {:else if u.must_change_password}<span class="chip soon">Invité</span>
              {:else}<span class="chip ok">Actif</span>{/if}
            </td>
            <td data-l="2FA">{#if u.mfa_enabled}<span class="chip ok">Activée</span>{:else if u.mfa_exempt}<span class="chip warn">Dispensée</span>{:else}<span class="chip off">À configurer</span>{/if}</td>
            <td data-l="Dernière connexion" class="muted">{fmt(u.last_login_at)}</td>
            <td class="r acts">
              {#if canEdit}<button type="button" class="icon" aria-label="Modifier {u.firstname}" title="Modifier" onclick={() => openEdit(u)}><Pencil size={15} /></button>{/if}
              <button type="button" class="icon" aria-label="Journal de {u.firstname}" title="Journal de sécurité" onclick={() => openJournal(u)}><History size={15} /></button>
              {#if canReset && !self}
                <button type="button" class="icon" aria-label="Réinitialiser le mot de passe" title="Réinitialiser le mot de passe" onclick={() => resetPassword(u)}><KeyRound size={15} /></button>
                <button type="button" class="icon" aria-label="Réinitialiser la 2FA" title="Réinitialiser la 2FA (téléphone perdu)" onclick={() => resetMfa(u)}><ShieldOff size={15} /></button>
              {/if}
              {#if canSuspend && !self}
                <button type="button" class="icon" class:danger={u.status === "active"} aria-label={u.status === "active" ? "Suspendre" : "Réactiver"} title={u.status === "active" ? "Suspendre" : "Réactiver"} onclick={() => toggleStatus(u)}>
                  {#if u.status === "active"}<Ban size={15} />{:else}<CircleCheck size={15} />{/if}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- creation / edition -->
<Modal open={editing !== null} title={editing === "new" ? "Nouvel utilisateur" : "Modifier l'utilisateur"} subtitle={editing === "new" ? "Un mot de passe temporaire lui est envoyé par email. À sa première connexion il choisira son mot de passe et activera la double authentification." : ""} locked={pending.is("save")} onclose={() => (editing = null)}>
  <form id="user-form" onsubmit={save}>
    <div class="two">
      <label>Prénom *<input type="text" bind:value={f.firstname} required maxlength="100" /></label>
      <label>Nom *<input type="text" bind:value={f.lastname} required maxlength="100" /></label>
    </div>
    <label>Email *<input type="email" bind:value={f.email} required disabled={editing !== "new"} autocomplete="off" /></label>
    <label>Rôle *
      <select bind:value={f.role_id} required>
        {#if editing !== "new" && editing && !assignable.some((r) => r.id === f.role_id)}<option value={f.role_id}>{roleName(f.role_id)} (actuel)</option>{/if}
        {#each assignable as r}<option value={r.id}>{r.name}{r.is_super ? " — accès total" : ` — ${r.permissions_count} permissions`}</option>{/each}
      </select>
    </label>
    <fieldset class="countries" disabled={roles.find((r) => r.id === f.role_id)?.is_super}>
      <legend>Pays accessibles *</legend>
      {#if roles.find((r) => r.id === f.role_id)?.is_super}
        <p class="hint">Un super-administrateur a accès à tous les pays.</p>
      {:else}
        {#if canGrantAll}
          <label class="cty-opt all"><input type="checkbox" bind:checked={f.all_countries} /> <strong>Tous les pays</strong> <small>(y compris les futurs)</small></label>
        {/if}
        <div class="cty-grid" class:dim={f.all_countries}>
          {#each grantable as c (c.code)}
            <label class="cty-opt"><input type="checkbox" disabled={f.all_countries} checked={f.all_countries || f.countries.includes(c.code)} onchange={(e) => toggleCountry(c.code, e.currentTarget.checked)} /> {c.code} · {c.name}</label>
          {/each}
        </div>
        <p class="hint">L'utilisateur ne verra et ne modifiera que les données de ces pays.</p>
      {/if}
    </fieldset>
    {#if assignable.length === 0}<p class="hint">Aucun rôle attribuable. Créez-en un dans l'onglet « Rôles ».</p>{/if}
    {#if editing !== "new"}<p class="hint">Le changement de rôle s'applique immédiatement, même si la personne est connectée.</p>{/if}
  </form>
  {#snippet footer()}
    <Btn class="btn-ghost" disabled={pending.is("save")} onclick={() => (editing = null)}>Annuler</Btn>
    <Btn type="submit" class="btn-primary" form="user-form" loading={pending.is("save")}>{editing === "new" ? "Créer et inviter" : "Enregistrer"}</Btn>
  {/snippet}
</Modal>

<!-- invitation / mot de passe temporaire -->
<Modal open={invitation !== null} title={invitation?.reset ? "Mot de passe réinitialisé" : "Utilisateur créé"} subtitle={invitation?.user.email ?? ""} locked={invitation?.data.temp_password != null} onclose={() => (invitation = null)}>
  {#if invitation}
    {#if invitation.data.sent}
      <p class="ok-line"><CircleCheck size={16} /> Un email d'invitation avec le mot de passe temporaire a été envoyé à <strong>{invitation.user.email}</strong>.</p>
    {:else}
      <p class="bad-line">L'email n'a pas pu être envoyé. Transmettez le mot de passe temporaire ci-dessous par un canal sûr, ou réinitialisez-le pour réessayer.</p>
    {/if}
    {#if invitation.data.temp_password}
      <div class="temp">
        <span>Mot de passe temporaire <em>(affiché une seule fois)</em></span>
        <code>{invitation.data.temp_password}</code>
        <button type="button" class="btn btn-outline btn-sm" onclick={() => copy(invitation!.data.temp_password!, "Mot de passe")}><Copy size={14} /> Copier</button>
      </div>
    {/if}
    <ol class="next">
      <li>La personne se connecte avec ce mot de passe.</li>
      <li>Elle choisit un mot de passe personnel.</li>
      <li>Elle active la double authentification (application sur son téléphone).</li>
    </ol>
  {/if}
  {#snippet footer()}<Btn class="btn-primary" onclick={() => (invitation = null)}>J'ai terminé</Btn>{/snippet}
</Modal>

<!-- journal -->
<Modal open={journalFor !== null} title="Journal de sécurité" subtitle={journalFor ? `${journalFor.firstname} ${journalFor.lastname ?? ""} · ${journalFor.email}` : ""} width="40rem" onclose={() => (journalFor = null)}>
  {#if events === null}
    <p class="center"><Spinner /> Chargement…</p>
  {:else if events.length === 0}
    <p class="muted">Aucun événement enregistré.</p>
  {:else}
    <ul class="events">
      {#each events as e (e.id)}
        <li class:fail={!e.success}>
          <strong>{EVENT_LABELS[e.event] ?? e.event}</strong>
          <small>{fmt(e.created_at)}{e.ip ? ` · ${e.ip}` : ""}</small>
          {#if e.detail}<small class="d">{e.detail}</small>{/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}<Btn class="btn-ghost" onclick={() => (journalFor = null)}>Fermer</Btn>{/snippet}
</Modal>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 1rem;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 999px;
    padding: 0 0.8rem;
    flex: 1 1 14rem;
    max-width: 22rem;
  }
  .search input {
    border: 0;
    outline: 0;
    background: transparent;
    padding: 0.5rem 0;
    width: 100%;
  }
  .toolbar select {
    width: auto;
    min-width: 11rem;
    padding-block: 0.5rem;
  }
  .new {
    margin-left: auto;
  }
  .tablewrap {
    padding: 0;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86rem;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  td {
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  tr.off .who,
  tr.off .chip.role {
    opacity: 0.55;
  }
  .r {
    text-align: right;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .who div {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .who small,
  td small {
    color: var(--muted);
    font-size: 0.74rem;
  }
  .who em {
    font-style: normal;
    font-weight: 500;
    color: var(--muted);
  }
  .av {
    flex: none;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--gold-soft, #fff4d1);
    font-weight: 800;
  }
  .chip {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 800;
    border-radius: 999px;
    padding: 0.18rem 0.6rem;
    background: #ececef;
    color: #3f444d;
    white-space: nowrap;
  }
  .chip.role {
    background: var(--green-soft);
    color: var(--green-deep);
  }
  .chip.role.super {
    background: var(--green-deep);
    color: #fff;
  }
  .chip.ok {
    background: #e2f3e8;
    color: var(--green-deep);
  }
  .chip.bad {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .chip.warn {
    background: #fff0d1;
    color: #8a5300;
  }
  .chip.soon {
    background: #e3ecff;
    color: #2a3f7a;
  }
  small.warn {
    display: block;
    color: #8a5300;
  }
  .muted {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .acts {
    white-space: nowrap;
  }
  .icon {
    border: 0;
    background: transparent;
    padding: 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: inline-grid;
    place-items: center;
  }
  .icon:hover {
    background: rgba(15, 23, 32, 0.08);
  }
  .icon.danger:hover {
    color: var(--danger);
  }
  .empty {
    text-align: center;
    color: var(--muted);
    padding: 2rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  input[type="text"],
  input[type="email"],
  select {
    width: 100%;
  }
  .countries {
    margin: 0;
    padding: 0.5rem 0.8rem 0.7rem;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    min-width: 0;
  }
  .countries legend {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0 0.3rem;
  }
  .cty-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.35rem 1rem;
  }
  .cty-grid.dim {
    opacity: 0.5;
  }
  form label.cty-opt {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    font-weight: 500;
    cursor: pointer;
  }
  form label.cty-opt.all {
    margin-bottom: 0.4rem;
  }
  .chip.cty {
    background: #eef1ff;
    color: #2a3f7a;
    margin-right: 0.25rem;
  }
  .chip.all {
    background: var(--green-deep);
    color: #fff;
  }
  .hint {
    margin: 0;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .ok-line,
  .bad-line {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.88rem;
    margin: 0.4rem 0 0.8rem;
  }
  .ok-line {
    color: var(--green-deep);
  }
  .bad-line {
    color: var(--danger);
  }
  .temp {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    background: #fff9e3;
    border: 1px dashed #e0c25b;
    border-radius: 12px;
    padding: 0.9rem;
    margin-bottom: 1rem;
  }
  .temp span {
    font-size: 0.8rem;
    font-weight: 700;
  }
  .temp em {
    font-weight: 500;
    color: var(--muted);
  }
  .temp code {
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    user-select: all;
    word-break: break-all;
  }
  .next {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.84rem;
    color: var(--ink-soft);
    line-height: 1.7;
  }
  .events {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .events li {
    display: flex;
    flex-direction: column;
    padding: 0.55rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }
  .events li.fail strong {
    color: var(--danger);
  }
  .events small {
    color: var(--muted);
    font-size: 0.74rem;
  }
  .events .d {
    font-style: italic;
  }
  .center {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  @media (max-width: 760px) {
    .toolbar select {
      width: 100%;
    }
    .new {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }
    .two {
      grid-template-columns: 1fr;
    }
    /* tableau -> cartes */
    thead {
      display: none;
    }
    table,
    tbody,
    tr,
    td {
      display: block;
    }
    tr {
      padding: 0.6rem 0.8rem;
      border-bottom: 1px solid var(--border);
    }
    td {
      border: 0;
      padding: 0.25rem 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    td[data-l]::before {
      content: attr(data-l);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
    }
    td[data-l="Utilisateur"]::before {
      display: none;
    }
    td.r {
      justify-content: flex-end;
    }
  }
</style>
