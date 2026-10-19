<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import Clock from "@lucide/svelte/icons/clock";
  import X from "@lucide/svelte/icons/x";
  import { portal } from "./portal";

  /**
   * Coque commune des selecteurs (date, periode, heure) : bouton declencheur + bulle positionnee sous le champ
   * (ou au-dessus s'il manque de la place), fermeture au clic exterieur / Echap, retour du focus, validation « requis ».
   * L'Echap est capte ici (stopPropagation) pour ne pas fermer en meme temps la modale qui contient le champ.
   */
  let {
    open = $bindable(false),
    display = "",
    placeholder = "",
    icon = "calendar",
    id,
    disabled = false,
    required = false,
    invalid = false,
    clearable = false,
    onclear,
    width = "19rem",
    children,
    "aria-label": ariaLabel,
  }: {
    open: boolean;
    display?: string;
    placeholder?: string;
    icon?: "calendar" | "clock";
    id?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    clearable?: boolean;
    onclear?: () => void;
    width?: string;
    children: Snippet;
    "aria-label"?: string;
  } = $props();

  let root = $state<HTMLDivElement | undefined>();
  let trigger = $state<HTMLButtonElement | undefined>();
  let panel = $state<HTMLDivElement | undefined>();
  let pos = $state({ top: 0, left: 0, ready: false });

  function place() {
    if (!root || !panel) return;
    const r = root.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(r.left, vw - pw - 8));
    const below = r.bottom + 6;
    const top = below + ph > vh - 8 && r.top - ph - 6 > 8 ? r.top - ph - 6 : Math.max(8, Math.min(below, vh - ph - 8));
    pos = { top, left, ready: true };
  }

  $effect(() => {
    if (!open) {
      // untrack : lire `pos` ici en plus de l'ecrire ferait de l'effet sa propre dependance (boucle infinie).
      untrack(() => {
        if (pos.ready) pos = { ...pos, ready: false };
      });
      return;
    }
    requestAnimationFrame(place);
    const onMove = () => place();
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!root?.contains(n) && !panel?.contains(n)) open = false;
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("pointerdown", onDown, true);
    // La taille de la bulle change (ex. calendrier 5 -> 6 semaines) : on se replace.
    const ro = new ResizeObserver(place);
    if (panel) ro.observe(panel);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("pointerdown", onDown, true);
      ro.disconnect();
    };
  });

  function close(refocus = true) {
    open = false;
    if (refocus) trigger?.focus();
  }
  function onKey(e: KeyboardEvent) {
    if (open && e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  }
</script>

<div class="dp" bind:this={root} onkeydown={onKey} role="presentation">
  <button
    bind:this={trigger}
    {id}
    type="button"
    class="dp-trigger"
    class:invalid
    class:open
    class:has-clear={clearable && !!display && !disabled}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label={ariaLabel}
    {disabled}
    onclick={() => (open = !open)}
  >
    {#if icon === "clock"}<Clock size={15} />{:else}<CalendarIcon size={15} />{/if}
    <span class="dp-text" class:ph={!display}>{display || placeholder}</span>
  </button>
  {#if clearable && display && !disabled}
    <button type="button" class="dp-clear" aria-label="Effacer" onclick={() => onclear?.()}><X size={13} /></button>
  {/if}
  {#if required}<input class="dp-req" tabindex="-1" aria-hidden="true" required value={display} oninput={() => {}} />{/if}
</div>

{#if open}
  <div class="dp-panel" use:portal bind:this={panel} role="dialog" aria-label={ariaLabel} style:top="{pos.top}px" style:left="{pos.left}px" style:width style:visibility={pos.ready ? "visible" : "hidden"} onkeydown={onKey} tabindex="-1">
    {@render children()}
  </div>
{/if}

<style>
  .dp {
    position: relative;
    display: block;
    min-width: 0;
  }
  .dp-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 1.5px solid var(--border, #d1d5db);
    border-radius: 12px;
    background: #fff;
    color: #1f2937;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .dp-trigger.has-clear {
    padding-right: 2.3rem;
  }
  .dp-trigger :global(svg) {
    flex: none;
    color: #6b7280;
  }
  .dp-trigger:hover:not(:disabled) {
    border-color: #9ca3af;
  }
  .dp-trigger:focus-visible,
  .dp-trigger.open {
    outline: none;
    border-color: var(--green, #0f7d41);
    box-shadow: 0 0 0 3px rgba(15, 125, 65, 0.14);
  }
  .dp-trigger.invalid {
    border-color: #dc2626;
  }
  .dp-trigger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .dp-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dp-text.ph {
    color: #9ca3af;
    font-weight: 400;
  }
  .dp-clear {
    position: absolute;
    right: 0.45rem;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 1.45rem;
    height: 1.45rem;
    border: 0;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    cursor: pointer;
  }
  .dp-clear:hover {
    background: #e5e7eb;
    color: #111827;
  }
  .dp-req {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .dp-panel {
    position: fixed;
    z-index: 2000;
    max-width: calc(100vw - 16px);
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 18px 50px rgba(15, 23, 32, 0.22), 0 2px 8px rgba(15, 23, 32, 0.08);
    font-family: inherit;
    color: #1f2937;
    outline: none;
    animation: dp-in 0.12s ease-out;
  }
  @keyframes dp-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dp-panel {
      animation: none;
    }
  }
</style>
