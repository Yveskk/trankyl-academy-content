<script lang="ts">
  let {
    size = 32,
    label = "",
    messages = [],
    interval = 3000,
  }: { size?: number; label?: string; messages?: string[]; interval?: number } = $props();

  let messageIndex = $state(0);

  $effect(() => {
    if (messages.length < 2) return;
    const timer = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
    }, interval);
    return () => clearInterval(timer);
  });

  let displayLabel = $derived(messages.length > 0 ? messages[messageIndex % messages.length] : label);
</script>

<div class="loader-wrap" role="status" aria-live="polite">
  <span class="loader-ring" style="width:{size}px;height:{size}px;"></span>
  {#if displayLabel}<span class="loader-label">{displayLabel}</span>{/if}
</div>

<style>
  .loader-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 2rem;
    flex: 1;
  }

  .loader-ring {
    display: inline-block;
    border: 3px solid rgba(3, 167, 26, 0.15);
    border-top-color: var(--green, #03a71a);
    border-radius: 50%;
    animation: loader-spin 0.7s linear infinite;
  }

  .loader-label {
    font-size: 0.85rem;
    color: var(--muted, #6b7280);
    font-weight: 600;
  }

  @keyframes loader-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
