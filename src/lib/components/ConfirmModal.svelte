<script lang="ts">
  import AlertTriangle from "@lucide/svelte/icons/triangle-alert";
  import CircleHelp from "@lucide/svelte/icons/circle-question-mark";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import Spinner from "./Spinner.svelte";

  let dialogEl = $state<HTMLDivElement | undefined>();
  let danger = $derived(confirmDialog.options.tone === "danger");

  // A l'ouverture : le focus va sur "Annuler" pour une action destructive
  // (on ne confirme pas par erreur avec Entree), sur "Confirmer" sinon.
  $effect(() => {
    if (!confirmDialog.open || !dialogEl) return;
    const target = dialogEl.querySelector<HTMLButtonElement>(danger ? "[data-cancel]" : "[data-confirm]");
    target?.focus();
  });

  function onKey(e: KeyboardEvent) {
    if (!confirmDialog.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      confirmDialog.cancel();
    }
    if (e.key === "Tab" && dialogEl) {
      const items = [...dialogEl.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if confirmDialog.open}
  <div class="cm-backdrop" role="presentation" onclick={() => confirmDialog.cancel()}></div>
  <div class="cm" role="alertdialog" aria-modal="true" aria-labelledby="cm-title" aria-describedby="cm-msg" bind:this={dialogEl}>
    <span class="cm-icon" class:danger>
      {#if danger}<AlertTriangle size={22} />{:else}<CircleHelp size={22} />{/if}
    </span>
    <h3 id="cm-title">{confirmDialog.options.title}</h3>
    {#if confirmDialog.options.message}<p id="cm-msg">{confirmDialog.options.message}</p>{/if}
    <div class="cm-actions">
      <button type="button" class="cm-btn cm-cancel" data-cancel disabled={confirmDialog.loading} onclick={() => confirmDialog.cancel()}>
        {confirmDialog.options.cancelLabel ?? "Annuler"}
      </button>
      <button type="button" class="cm-btn cm-confirm" class:danger data-confirm disabled={confirmDialog.loading} aria-busy={confirmDialog.loading} onclick={() => confirmDialog.confirm()}>
        {#if confirmDialog.loading}<Spinner />{/if}
        {confirmDialog.options.confirmLabel ?? "Confirmer"}
      </button>
    </div>
  </div>
{/if}

<style>
  .cm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 32, 0.55);
    z-index: 400;
    animation: fade 0.15s ease-out;
  }
  .cm {
    position: fixed;
    z-index: 401;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(26rem, calc(100% - 2rem));
    background: #fff;
    border-radius: 18px;
    padding: 1.6rem 1.5rem 1.3rem;
    box-shadow: 0 24px 60px rgba(15, 23, 32, 0.35);
    text-align: center;
    animation: pop 0.18s ease-out;
  }
  .cm-icon {
    display: inline-grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--green-soft, #e6f7e8);
    color: var(--green-dark, #028a15);
    margin-bottom: 0.7rem;
  }
  .cm-icon.danger {
    background: var(--danger-soft, #fef2f2);
    color: var(--danger, #dc2626);
  }
  h3 {
    margin: 0 0 0.4rem;
    font-size: 1.1rem;
  }
  p {
    margin: 0 0 1.2rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--ink-soft, #4b5563);
  }
  .cm-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
    margin-top: 1rem;
  }
  .cm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-width: 7.5rem;
    border-radius: 10px;
    padding: 0.65rem 1.1rem;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px solid transparent;
  }
  .cm-btn:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  .cm-cancel {
    background: #fff;
    border-color: var(--border, #e5e7eb);
    color: var(--ink, #0f1720);
  }
  .cm-cancel:hover:not(:disabled) {
    background: #f3f4f6;
  }
  .cm-confirm {
    background: var(--green, #03a71a);
    color: #fff;
  }
  .cm-confirm.danger {
    background: var(--danger, #dc2626);
  }
  .cm-confirm:hover:not(:disabled) {
    filter: brightness(0.95);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.97);
    }
  }
</style>
