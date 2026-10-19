<script lang="ts">
  import type { Snippet } from "svelte";
  import Spinner from "./Spinner.svelte";

  // Bouton d'action avec indicateur de chargement : desactive et affiche un
  // spinner tant que `loading` est vrai, sans changer sa largeur.
  let {
    loading = false,
    disabled = false,
    type = "button",
    class: className = "",
    onclick,
    children,
    ...rest
  }: {
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit";
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
    [key: string]: unknown;
  } = $props();
</script>

<button {type} class="btn {className}" class:is-loading={loading} disabled={disabled || loading} aria-busy={loading} {onclick} {...rest}>
  {#if loading}<Spinner />{/if}
  {@render children()}
</button>

<style>
  .is-loading {
    cursor: progress;
  }
  button {
    gap: 0.45rem;
  }
</style>
