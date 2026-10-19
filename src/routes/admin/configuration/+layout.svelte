<script lang="ts">
  import { page } from "$app/stores";
  import Globe from "@lucide/svelte/icons/globe";

  let { children } = $props();

  // Rubriques de configuration : ajouter ici les prochaines (devises, paiement, ...).
  const tabs = [{ href: "/admin/configuration/pays", label: "Pays", icon: Globe }];
</script>

<div class="config">
  <nav class="tabs" aria-label="Rubriques de configuration">
    {#each tabs as tab}
      {@const Icon = tab.icon}
      <a href={tab.href} class:active={$page.url.pathname.startsWith(tab.href)}><Icon size={15} /> {tab.label}</a>
    {/each}
  </nav>
  {@render children()}
</div>

<style>
  .config {
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
  .tabs a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
    text-decoration: none;
  }
  .tabs a:hover {
    background: var(--green-soft);
  }
  .tabs a.active {
    background: var(--green-deep);
    color: #fff;
  }
</style>
