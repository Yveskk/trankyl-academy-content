<script lang="ts">
  import X from "@lucide/svelte/icons/x";

  // Visionneuse plein ecran : Echap / clic sur le fond / bouton pour fermer.
  let { src, alt = "", open = $bindable(false) }: { src: string; alt?: string; open: boolean } = $props();
  let closeBtn = $state<HTMLButtonElement | undefined>();

  $effect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        open = false;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  });
</script>

{#if open}
  <div class="lb" role="dialog" aria-modal="true" aria-label={alt}>
    <button type="button" class="lb-bg" aria-label="Fermer" onclick={() => (open = false)}></button>
    <img {src} {alt} />
    <button type="button" class="lb-x" bind:this={closeBtn} aria-label="Fermer" onclick={() => (open = false)}><X size={22} /></button>
  </div>
{/if}

<style>
  .lb { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1.5rem; animation: lb-in 0.18s ease-out; }
  .lb-bg { position: absolute; inset: 0; border: none; background: rgba(5, 15, 8, 0.86); cursor: zoom-out; }
  img { position: relative; max-width: min(92vw, 900px); max-height: 88vh; object-fit: contain; border-radius: 14px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); background: #fff; }
  .lb-x { position: absolute; top: 1rem; right: 1rem; width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.16); color: #fff; cursor: pointer; }
  .lb-x:hover { background: rgba(255, 255, 255, 0.28); }
  @keyframes lb-in { from { opacity: 0; } to { opacity: 1; } }
</style>
