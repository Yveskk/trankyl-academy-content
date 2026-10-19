<script lang="ts">
  import type { Snippet } from "svelte";
  import X from "@lucide/svelte/icons/x";

  // Fenetre modale accessible : Echap / clic exterieur pour fermer (sauf `locked`), focus piege, defilement interne.
  let {
    open,
    title,
    subtitle = "",
    width = "34rem",
    locked = false,
    onclose,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    subtitle?: string;
    width?: string;
    /** Empeche la fermeture (ex. pendant un envoi, ou quand l'information ne sera plus affichee). */
    locked?: boolean;
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  let dialog = $state<HTMLDivElement | undefined>();

  $effect(() => {
    if (!open || !dialog) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = dialog.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button:not(.m-close)");
    first?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  });

  function close() {
    if (!locked) onclose();
  }
  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key === "Tab" && dialog) {
      const items = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="m-backdrop" role="presentation" onclick={close}></div>
  <div class="m" role="dialog" aria-modal="true" aria-labelledby="m-title" style="--w:{width}" bind:this={dialog}>
    <header>
      <div>
        <h3 id="m-title">{title}</h3>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      {#if !locked}<button type="button" class="m-close" aria-label="Fermer" onclick={close}><X size={18} /></button>{/if}
    </header>
    <div class="m-body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
{/if}

<style>
  .m-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 32, 0.55);
    z-index: 300;
    animation: fade 0.15s ease-out;
  }
  .m {
    position: fixed;
    z-index: 301;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(var(--w), calc(100% - 1.5rem));
    max-height: calc(100dvh - 2rem);
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(15, 23, 32, 0.35);
    animation: pop 0.18s ease-out;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.2rem 1.4rem 0.6rem;
  }
  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  header p {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--muted, #6b7280);
  }
  .m-close {
    border: 0;
    background: transparent;
    border-radius: 8px;
    padding: 0.35rem;
    cursor: pointer;
    color: var(--ink-soft, #46524b);
  }
  .m-close:hover {
    background: rgba(15, 23, 32, 0.08);
  }
  .m-body {
    padding: 0.4rem 1.4rem 1rem;
    overflow-y: auto;
  }
  .m-body :global(form) {
    max-width: none;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.9rem 1.4rem 1.2rem;
    border-top: 1px solid var(--border, #e5e7eb);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.98);
    }
  }
</style>
