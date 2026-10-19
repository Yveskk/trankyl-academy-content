<script lang="ts">
  // QR code genere dans le navigateur (bibliotheque chargee a la demande) : le secret ne quitte jamais la page.
  let { value, size = 200, label = "QR code" }: { value: string; size?: number; label?: string } = $props();
  let src = $state<string | null>(null);
  let failed = $state(false);

  $effect(() => {
    const v = value;
    let cancelled = false;
    src = null;
    failed = false;
    (async () => {
      try {
        const url = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
        const mod: any = await import(/* @vite-ignore */ url);
        const data: string = await (mod.default ?? mod).toDataURL(v, { margin: 1, width: size * 2, errorCorrectionLevel: "M" });
        if (!cancelled) src = data;
      } catch {
        if (!cancelled) failed = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="qr" style="width:{size}px;height:{size}px">
  {#if src}
    <img {src} alt={label} width={size} height={size} />
  {:else if failed}
    <p>QR code indisponible : utilisez la clé de saisie manuelle.</p>
  {:else}
    <span class="sk" aria-hidden="true"></span>
  {/if}
</div>

<style>
  .qr {
    display: grid;
    place-items: center;
    background: #fff;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 14px;
    padding: 6px;
    box-sizing: content-box;
  }
  img {
    display: block;
    image-rendering: pixelated;
  }
  p {
    margin: 0;
    padding: 0.6rem;
    font-size: 0.75rem;
    text-align: center;
    color: var(--muted, #6b7280);
  }
  .sk {
    width: 70%;
    height: 70%;
    border-radius: 10px;
    background: linear-gradient(90deg, #eef0ee 25%, #f7f8f7 50%, #eef0ee 75%);
    background-size: 200% 100%;
    animation: sh 1.2s infinite;
  }
  @keyframes sh {
    to {
      background-position: -200% 0;
    }
  }
</style>
