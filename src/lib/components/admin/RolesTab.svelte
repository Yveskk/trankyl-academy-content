<script lang="ts">
  import { onMount } from "svelte";
  import { createRole, deleteRole, getPermissions, listRoles, updateRole, type PermGroup, type Role } from "$lib/api/access";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { adminCountry } from "$lib/stores/adminCountry.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Eye from "@lucide/svelte/icons/eye";
  import Lock from "@lucide/svelte/icons/lock";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Users from "@lucide/svelte/icons/users";

  let { onchanged }: { onchanged?: () => void } = $props();

  const pending = new Pending();
  let roles = $state<Role[]>([]);
  let groups = $state<PermGroup[]>([]);
  let loading = $state(true);
  let canManage = $derived(auth.can("academy.roles.manage"));

  // null = ferme ; "new" = creation ; Role = edition / consultation
  let editing = $state<Role | "new" | null>(null);
  let name = $state("");
  let description = $state("");
  let selected = $state<Set<string>>(new Set());
  let filter = $state("");
  // Pays dans lesquels le role est proposable. "global" = tous (reserve a qui a acces a tous les pays).
  let isGlobal = $state(false);
  let roleCountries = $state<string[]>([]);
  let myCountries = $derived(auth.admin?.countries ?? []);
  let canGlobal = $derived(!!auth.admin?.all_countries);
  function toggleCountry(code: string, on: boolean) {
    roleCountries = on ? [...new Set([...roleCountries, code])] : roleCountries.filter((c) => c !== code);
  }

  async function load() {
    loading = true;
    try {
      [roles, groups] = await Promise.all([listRoles(), getPermissions()]);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  let readOnly = $derived(!canManage || (editing !== null && editing !== "new" && editing.is_super));
  let allKeys = $derived(groups.flatMap((g) => g.actions.map((a) => a.key)));
  // On ne peut accorder que ce qu'on possede soi-meme (le serveur le refuse de toute facon).
  const grantable = (key: string) => auth.can(key);
  let shownGroups = $derived(groups.filter((g) => !filter.trim() || g.label.toLowerCase().includes(filter.trim().toLowerCase())));

  function openNew() {
    name = "";
    description = "";
    selected = new Set();
    filter = "";
    isGlobal = false;
    roleCountries = adminCountry.code ? [adminCountry.code] : [];
    editing = "new";
  }
  function openRole(r: Role) {
    name = r.name;
    description = r.description ?? "";
    selected = new Set(r.is_super ? allKeys : r.permissions);
    filter = "";
    isGlobal = r.is_global;
    roleCountries = [...r.countries];
    editing = r;
  }

  const viewKey = (g: PermGroup) => g.actions.find((a) => a.action === "view")?.key;

  function toggle(g: PermGroup, key: string, on: boolean) {
    const next = new Set(selected);
    const view = viewKey(g);
    if (on) {
      next.add(key);
      if (view) next.add(view); // agir suppose de voir
    } else {
      next.delete(key);
      if (key === view) g.actions.forEach((a) => next.delete(a.key)); // plus de lecture = plus d'action
    }
    selected = next;
  }
  function toggleGroup(g: PermGroup, on: boolean) {
    const next = new Set(selected);
    for (const a of g.actions) {
      if (on && grantable(a.key)) next.add(a.key);
      if (!on) next.delete(a.key);
    }
    selected = next;
  }
  const groupState = (g: PermGroup) => {
    const n = g.actions.filter((a) => selected.has(a.key)).length;
    return n === 0 ? "none" : n === g.actions.length ? "all" : "some";
  };
  function preset(kind: "read" | "none") {
    selected = new Set(kind === "none" ? [] : allKeys.filter((k) => k.endsWith(".view") && grantable(k)));
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (readOnly || editing === null) return;
    if (selected.size === 0) {
      snackbar.error("Cochez au moins une permission.");
      return;
    }
    if (!isGlobal && roleCountries.length === 0 && !(editing !== "new" && editing?.is_super)) {
      snackbar.error("Choisissez au moins un pays, ou « Tous les pays ».");
      return;
    }
    const body = { name: name.trim(), description: description.trim() || null, permissions: [...selected], countries: isGlobal ? [] : roleCountries };
    await pending.run("save", async () => {
      try {
        if (editing === "new") await createRole(body);
        else if (editing) await updateRole(editing.id, body);
        snackbar.success(editing === "new" ? "Rôle créé." : "Rôle enregistré : les accès sont mis à jour immédiatement.");
        editing = null;
        await load();
        onchanged?.();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function remove(r: Role) {
    const done = await confirmDialog.ask({
      title: `Supprimer le rôle « ${r.name} » ?`,
      message: "Cette action est définitive. Un rôle encore attribué à des utilisateurs ne peut pas être supprimé.",
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await deleteRole(r.id);
        await load();
        onchanged?.();
      },
    });
    if (done) snackbar.success("Rôle supprimé.");
  }
</script>

<div class="head">
  <p class="intro">Un <strong>rôle</strong> regroupe les menus et les actions autorisés. Attribuez-le ensuite à chaque utilisateur : il ne verra que ce que son rôle permet, et tout changement s'applique immédiatement.</p>
  {#if canManage}<button type="button" class="btn btn-gold btn-sm" onclick={openNew}><Plus size={14} /> Nouveau rôle</button>{/if}
</div>

{#if loading && roles.length === 0}
  <div class="loading-state">Chargement...</div>
{:else}
  <div class="grid">
    {#each roles as r (r.id)}
      <article class="card role">
        <div class="top">
          <h4>{r.name}</h4>
          {#if r.is_super}<span class="chip sys"><Lock size={11} /> Protégé</span>{/if}
        </div>
        <p class="desc">{r.description || (r.is_super ? "Accès total à l'administration." : "Aucune description.")}</p>
        <div class="stats">
          <span><ShieldAlert size={13} /> {r.is_super ? "Toutes les permissions" : `${r.permissions_count} permission${r.permissions_count > 1 ? "s" : ""}`}</span>
          <span><Users size={13} /> {r.users_count} utilisateur{r.users_count > 1 ? "s" : ""}</span>
          <span class="cty">{#if r.is_global}Tous les pays{:else}{r.countries.join(" · ")}{/if}</span>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline btn-sm" onclick={() => openRole(r)}>
            {#if canManage && !r.is_super}<Pencil size={13} /> Modifier{:else}<Eye size={13} /> Consulter{/if}
          </button>
          {#if canManage && !r.is_super}
            <button type="button" class="icon danger" aria-label="Supprimer le rôle {r.name}" title={r.users_count ? "Attribué à des utilisateurs" : "Supprimer"} disabled={r.users_count > 0} onclick={() => remove(r)}><Trash2 size={15} /></button>
          {/if}
        </div>
      </article>
    {/each}
  </div>
{/if}

<Modal open={editing !== null} title={editing === "new" ? "Nouveau rôle" : readOnly ? `Rôle « ${name} »` : "Modifier le rôle"} subtitle={readOnly ? "Consultation seule." : "Cochez ce que ce rôle peut voir et faire."} width="52rem" locked={pending.is("save")} onclose={() => (editing = null)}>
  <form id="role-form" onsubmit={save}>
    <div class="two">
      <label>Nom du rôle *<input type="text" bind:value={name} required minlength="2" maxlength="100" placeholder="Ex. Éditeur de contenu" disabled={readOnly} /></label>
      <label>Description<input type="text" bind:value={description} maxlength="255" placeholder="À quoi sert ce rôle ?" disabled={readOnly} /></label>
    </div>

    <fieldset class="rc" disabled={readOnly || (editing !== "new" && editing !== null && editing.is_super)}>
      <legend>Pays où ce rôle est proposable</legend>
      {#if canGlobal}<label class="rc-opt"><input type="checkbox" bind:checked={isGlobal} /> <strong>Tous les pays</strong></label>{/if}
      <div class="rc-grid" class:dim={isGlobal}>
        {#each myCountries as c (c.code)}
          <label class="rc-opt"><input type="checkbox" disabled={isGlobal} checked={isGlobal || roleCountries.includes(c.code)} onchange={(e) => toggleCountry(c.code, e.currentTarget.checked)} /> {c.code} · {c.name}</label>
        {/each}
      </div>
    </fieldset>

    <div class="bar">
      <div class="search"><Search size={14} /><input type="search" placeholder="Filtrer les menus" bind:value={filter} aria-label="Filtrer les menus" /></div>
      <span class="count">{selected.size} / {allKeys.length} permissions</span>
      {#if !readOnly}
        <button type="button" class="link" onclick={() => preset("read")}>Lecture seule</button>
        <button type="button" class="link" onclick={() => preset("none")}>Tout décocher</button>
      {/if}
    </div>

    <div class="matrix">
      {#each shownGroups as g (g.menu)}
        {@const st = groupState(g)}
        <fieldset class:on={st !== "none"} disabled={readOnly}>
          <legend>
            <label class="all">
              <input type="checkbox" checked={st === "all"} indeterminate={st === "some"} onchange={(e) => toggleGroup(g, e.currentTarget.checked)} />
              <strong>{g.label}</strong>
            </label>
          </legend>
          <div class="acts">
            {#each g.actions as a (a.key)}
              {@const can = grantable(a.key) || selected.has(a.key)}
              <label class="act" class:locked={!can} title={can ? "" : "Vous ne possédez pas cette permission : vous ne pouvez pas l'accorder."}>
                <input type="checkbox" checked={selected.has(a.key)} disabled={!can && !selected.has(a.key)} onchange={(e) => toggle(g, a.key, e.currentTarget.checked)} />
                <span>{a.label}</span>
                {#if a.sensitive}<ShieldAlert size={12} class="sens" aria-label="Permission sensible" />{/if}
              </label>
            {/each}
          </div>
        </fieldset>
      {:else}
        <p class="muted">Aucun menu ne correspond.</p>
      {/each}
    </div>
    <p class="legend"><ShieldAlert size={12} /> Permission sensible : donne un contrôle sur les accès (utilisateurs, rôles). À réserver aux administrateurs.</p>
  </form>
  {#snippet footer()}
    <Btn class="btn-ghost" disabled={pending.is("save")} onclick={() => (editing = null)}>{readOnly ? "Fermer" : "Annuler"}</Btn>
    {#if !readOnly}<Btn type="submit" class="btn-primary" form="role-form" loading={pending.is("save")}>{editing === "new" ? "Créer le rôle" : "Enregistrer"}</Btn>{/if}
  {/snippet}
</Modal>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .intro {
    margin: 0;
    max-width: 48rem;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 1rem;
  }
  .role {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  h4 {
    margin: 0;
    font-size: 1rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.68rem;
    font-weight: 800;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
  }
  .chip.sys {
    background: #ececef;
    color: #3f444d;
  }
  .desc {
    margin: 0;
    font-size: 0.82rem;
    color: var(--muted);
    min-height: 2.4em;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }
  .stats span {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 0.4rem;
  }
  .icon {
    border: 0;
    background: transparent;
    padding: 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: grid;
    place-items: center;
  }
  .icon:hover:not(:disabled) {
    background: rgba(15, 23, 32, 0.08);
  }
  .icon.danger:hover:not(:disabled) {
    color: var(--danger);
  }
  .icon:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  form label:not(.all):not(.act) {
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
  input[type="search"] {
    width: 100%;
  }
  .rc {
    margin: 0.9rem 0 0;
    padding: 0.4rem 0.8rem 0.7rem;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    min-width: 0;
  }
  .rc legend {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0 0.3rem;
  }
  .rc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.35rem 1rem;
  }
  .rc-grid.dim {
    opacity: 0.5;
  }
  form label.rc-opt {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    font-weight: 500;
    cursor: pointer;
  }
  .stats .cty {
    color: #2a3f7a;
    font-weight: 700;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin: 1rem 0 0.6rem;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0 0.7rem;
    flex: 1 1 12rem;
    max-width: 18rem;
  }
  .search input {
    border: 0;
    outline: 0;
    background: transparent;
    padding: 0.4rem 0;
    min-width: 0;
  }
  .count {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ink-soft);
    margin-right: auto;
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.8rem;
    text-decoration: underline;
    color: var(--green-deep);
    cursor: pointer;
  }
  .matrix {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.7rem;
  }
  fieldset {
    margin: 0;
    padding: 0.2rem 0.8rem 0.7rem;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    min-width: 0;
  }
  fieldset.on {
    border-color: var(--green);
    background: var(--green-soft);
  }
  legend {
    padding: 0 0.3rem;
  }
  .all,
  .act {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    cursor: pointer;
  }
  .all strong {
    font-size: 0.88rem;
  }
  .acts {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .act {
    font-size: 0.82rem;
    font-weight: 500;
  }
  .act.locked {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .act :global(.sens),
  .legend :global(svg) {
    color: #b45309;
    flex: none;
  }
  .legend {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    margin: 0.8rem 0 0;
    font-size: 0.74rem;
    color: var(--muted);
  }
  @media (max-width: 640px) {
    .head {
      flex-direction: column;
    }
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
