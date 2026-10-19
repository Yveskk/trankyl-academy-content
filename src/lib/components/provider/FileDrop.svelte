<script lang="ts">
  import Camera from "@lucide/svelte/icons/camera";
  import FileText from "@lucide/svelte/icons/file-text";
  import Upload from "@lucide/svelte/icons/upload";
  import X from "@lucide/svelte/icons/x";
  import Check from "@lucide/svelte/icons/check";

  // Carte de dépôt d'une pièce : photo (appareil ou fichier) ou PDF, aperçu, retrait. Le fichier est vérifié côté serveur.
  let {
    label,
    hint = "",
    url = "",
    file = null,
    required = false,
    disabled = false,
    camera = true,
    accept = "image/jpeg,image/png,image/webp,application/pdf",
    onpick,
    onclear,
  }: {
    label: string;
    hint?: string;
    url?: string;
    file?: File | null;
    required?: boolean;
    disabled?: boolean;
    camera?: boolean;
    accept?: string;
    onpick: (f: File) => void;
    onclear: () => void;
  } = $props();

  let input = $state<HTMLInputElement | undefined>();
  let cam = $state<HTMLInputElement | undefined>();
  let preview = $state<string | null>(null);

  $effect(() => {
    if (file && file.type.startsWith("image/")) {
      const u = URL.createObjectURL(file);
      preview = u;
      return () => URL.revokeObjectURL(u);
    }
    preview = null;
  });

  const isPdf = $derived(file ? file.type === "application/pdf" : /\.pdf($|\?)/i.test(url));
  const shown = $derived(preview ?? (!isPdf && url ? url : null));
  const has = $derived(!!file || !!url);

  function pick(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = "";
    if (f) onpick(f);
  }
</script>

<div class="fd" class:has class:off={disabled}>
  <div class="head"><strong>{label}{#if required}<em>*</em>{/if}</strong></div>
  <div class="body">
    {#if shown}
      <img src={shown} alt={label} />
    {:else if has && isPdf}
      <a class="pdf" href={url || "#"} target="_blank" rel="noopener noreferrer"><FileText size={26} /><span>{file?.name ?? "Document PDF"}</span></a>
    {/if}
  </div>
  {#if has}
    <p class="ok"><Check size={14} /> {file ? "Prêt à envoyer" : "Reçu"}</p>
  {:else if hint}
    <p class="hint">{hint}</p>
  {/if}
  {#if !disabled}
    <div class="acts">
      {#if camera}
        <button type="button" class="dark" onclick={() => cam?.click()}><Camera size={15} /> Prendre une photo</button>
      {/if}
      <button type="button" onclick={() => input?.click()}><Upload size={15} /> {has ? "Remplacer" : "Importer"}</button>
      {#if has}<button type="button" class="x" aria-label="Retirer" onclick={onclear}><X size={15} /></button>{/if}
    </div>
  {/if}
  <input bind:this={input} type="file" {accept} hidden onchange={pick} />
  <input bind:this={cam} type="file" accept="image/*" capture="environment" hidden onchange={pick} />
</div>

<style>
  .fd { display: flex; flex-direction: column; gap: 0.6rem; min-height: 15rem; padding: 0.9rem; border: 2px dashed #b9bcc4; border-radius: 14px; background: #fff; }
  .fd.has { border: 2px solid #1c8f4a; background: #eaf6ee; }
  .fd.off { opacity: 0.85; }
  .head strong { font-size: 0.85rem; color: #1d2230; }
  .head em { color: #c0392b; font-style: normal; margin-left: 0.15rem; }
  .body { flex: 1; display: grid; place-items: center; min-height: 5rem; }
  .body img { max-width: 100%; max-height: 8rem; object-fit: contain; border-radius: 8px; }
  .pdf { display: inline-flex; align-items: center; gap: 0.4rem; color: #1d2230; text-decoration: none; font-size: 0.8rem; font-weight: 600; overflow-wrap: anywhere; }
  .hint { margin: 0; font-size: 0.78rem; color: #6b7280; }
  .ok { margin: 0; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; color: #1c8f4a; }
  .acts { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .acts button { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid #d3d6dc; background: #fff; font: inherit; font-weight: 700; font-size: 0.8rem; color: #1d2230; cursor: pointer; }
  .acts button:hover { border-color: #9aa0ad; }
  .acts .dark { background: #2b303a; color: #fff; border-color: #2b303a; }
  .acts .x { padding: 0.5rem; margin-left: auto; color: #b3261e; }
</style>
