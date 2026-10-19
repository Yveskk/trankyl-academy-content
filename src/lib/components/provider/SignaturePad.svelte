<script lang="ts">
  import Eraser from "@lucide/svelte/icons/eraser";

  // Zone de signature au doigt / à la souris. `value` = image PNG (data URI) ou "" ; effacer la remet à vide.
  let { value = $bindable(""), disabled = false }: { value: string; disabled?: boolean } = $props();
  let canvas = $state<HTMLCanvasElement | undefined>();
  let drawing = false;
  let last: { x: number; y: number } | null = null;

  function ctx() {
    const c = canvas!.getContext("2d")!;
    c.lineWidth = 2.4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "#111827";
    return c;
  }
  function pos(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas!.width, y: ((e.clientY - r.top) / r.height) * canvas!.height };
  }
  function down(e: PointerEvent) {
    if (disabled) return;
    drawing = true;
    last = pos(e);
    try {
      canvas!.setPointerCapture(e.pointerId);
    } catch {
      /* pointeur synthétique : sans capture, le tracé fonctionne quand même */
    }
    const c = ctx();
    c.beginPath();
    c.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
    c.fill();
  }
  function move(e: PointerEvent) {
    if (!drawing || !last) return;
    const p = pos(e);
    const c = ctx();
    c.beginPath();
    c.moveTo(last.x, last.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last = p;
  }
  function up() {
    if (!drawing) return;
    drawing = false;
    last = null;
    value = canvas!.toDataURL("image/png");
  }
  function clear() {
    canvas!.getContext("2d")!.clearRect(0, 0, canvas!.width, canvas!.height);
    value = "";
  }
  // Signature déjà enregistrée : affichée dans la zone (et conservée tant qu'on ne signe pas à nouveau).
  $effect(() => {
    if (!canvas || !value || drawing) return;
    const img = new Image();
    img.onload = () => {
      const c = canvas!.getContext("2d")!;
      c.clearRect(0, 0, canvas!.width, canvas!.height);
      c.drawImage(img, 0, 0, canvas!.width, canvas!.height);
    };
    img.src = value;
  });
</script>

<div class="sig" class:off={disabled}>
  <canvas bind:this={canvas} width="800" height="320" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} aria-label="Zone de signature"></canvas>
  {#if !value && !disabled}<span class="ph">Signez ici</span>{/if}
  {#if !disabled}<button type="button" onclick={clear} disabled={!value}><Eraser size={14} /> Effacer</button>{/if}
</div>

<style>
  .sig { position: relative; border: 2px dashed #b9bcc4; border-radius: 14px; background: #fff; }
  .sig.off { border-style: solid; border-color: #d3d6dc; }
  canvas { display: block; width: 100%; height: 11rem; touch-action: none; cursor: crosshair; }
  .ph { position: absolute; inset: 0; display: grid; place-items: center; color: #b0b4bd; font-weight: 700; pointer-events: none; }
  button { position: absolute; right: 0.6rem; bottom: 0.6rem; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.7rem; border-radius: 8px; border: 1px solid #d3d6dc; background: #fff; font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: default; }
</style>
