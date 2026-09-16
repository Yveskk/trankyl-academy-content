<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";
  import { snackbar } from "$lib/stores/snackbar.svelte";
</script>

<div class="snackbar-stack">
  {#each snackbar.toasts as toast (toast.id)}
    <div class="snackbar-item" class:success={toast.type === "success"} class:error={toast.type === "error"}>
      {#if toast.type === "success"}
        <CircleCheck size={16} />
      {:else if toast.type === "error"}
        <CircleAlert size={16} />
      {:else}
        <Info size={16} />
      {/if}
      <span>{toast.message}</span>
      <button type="button" onclick={() => snackbar.dismiss(toast.id)} aria-label="Fermer">
        <X size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .snackbar-stack {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
    right: 1.25rem;
    z-index: 500;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 360px;
  }

  .snackbar-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: #111827;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.22);
    animation: snackbar-in 0.2s ease-out;
  }

  .snackbar-item.success {
    background: #04330d;
  }

  .snackbar-item.error {
    background: #7f1d1d;
  }

  .snackbar-item span {
    flex: 1;
    line-height: 1.4;
  }

  .snackbar-item button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    padding: 0;
    flex-shrink: 0;
  }

  .snackbar-item button:hover {
    color: #fff;
  }

  @keyframes snackbar-in {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    .snackbar-stack {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>
