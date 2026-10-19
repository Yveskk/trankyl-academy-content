<script lang="ts">
  import { goto } from "$app/navigation";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import { navHistory } from "$lib/stores/history.svelte";
  import { i18n } from "$lib/stores/locale.svelte";

  // `fallback` : page ouverte quand il n'y a pas d'historique interne.
  let { fallback, label, class: className = "" }: { fallback: string; label?: string; class?: string } = $props();

  // Branche en phase de CAPTURE : le routeur de SvelteKit ecoute les clics sur
  // les liens plus haut dans l'arbre ; sans cela il naviguerait vers `fallback`
  // avant que ce gestionnaire puisse decider de revenir dans l'historique.
  function onclick(event: MouseEvent) {
    // Ctrl/Cmd/Maj/clic milieu : on laisse le navigateur ouvrir le lien normalement.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (navHistory.canGoBack) history.back();
    else goto(fallback);
  }
</script>

<a class="page-back {className}" href={fallback} onclickcapture={onclick}>
  <ArrowLeft size={16} aria-hidden="true" />
  <span>{label ?? (i18n.locale === "en" ? "Back" : "Retour")}</span>
</a>

<style>
  .page-back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.8rem 0.35rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft, #46524b);
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
  }
  .page-back:hover {
    background: var(--green-soft, #e6f7e8);
    color: var(--green-dark, #028a15);
    text-decoration: none;
  }
  .page-back:focus-visible {
    outline: 2px solid var(--green, #03a71a);
    outline-offset: 2px;
  }
</style>
