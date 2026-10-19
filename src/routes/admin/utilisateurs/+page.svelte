<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import RolesTab from "$lib/components/admin/RolesTab.svelte";
  import UsersTab from "$lib/components/admin/UsersTab.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Users from "@lucide/svelte/icons/users";

  // Deux onglets selon les droits : "Liste utilisateurs" (users.view) et "Rôles" (roles.view).
  let tabs = $derived([
    ...(auth.can("academy.users.view") ? [{ id: "users", label: "Liste utilisateurs", icon: Users }] : []),
    ...(auth.can("academy.roles.view") ? [{ id: "roles", label: "Rôles", icon: ShieldCheck }] : []),
  ]);
  let tab = $derived.by(() => {
    const wanted = $page.url.searchParams.get("tab");
    return tabs.find((t) => t.id === wanted)?.id ?? tabs[0]?.id;
  });
  let rolesVersion = $state(0);

  function select(id: string) {
    goto(`?tab=${id}`, { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

<div class="wrap">
  <div class="tabs" role="tablist" aria-label="Utilisateurs et rôles">
    {#each tabs as t}
      {@const Icon = t.icon}
      <button type="button" role="tab" id="tab-{t.id}" aria-selected={tab === t.id} aria-controls="panel-{t.id}" class:active={tab === t.id} onclick={() => select(t.id)}>
        <Icon size={15} /> {t.label}
      </button>
    {/each}
  </div>

  {#if tab === "users"}
    <div id="panel-users" role="tabpanel" aria-labelledby="tab-users"><UsersTab refreshKey={rolesVersion} /></div>
  {:else if tab === "roles"}
    <div id="panel-roles" role="tabpanel" aria-labelledby="tab-roles"><RolesTab onchanged={() => rolesVersion++} /></div>
  {/if}
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .tabs {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.6rem;
  }
  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .tabs button:hover {
    background: var(--green-soft);
  }
  .tabs button.active {
    background: var(--green-deep);
    color: #fff;
  }
</style>
