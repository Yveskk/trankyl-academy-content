<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import Copy from "@lucide/svelte/icons/copy";
  import Share2 from "@lucide/svelte/icons/share-2";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Download from "@lucide/svelte/icons/download";
  import QrCode from "$lib/components/QrCode.svelte";
  import { getShare } from "$lib/api/providerAccount";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let path = $state<string | null>(null);
  let name = $state("");
  let verified = $state(false);
  let loading = $state(true);
  const url = $derived(path && browser ? `${location.origin}${path}` : "");
  const text = $derived(`Découvrez mon profil sur Trankyl : ${url}`);

  onMount(async () => {
    try {
      const r = await getShare();
      path = r.path;
      name = r.name;
      verified = r.verified;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      snackbar.success("Lien copié.");
    } catch {
      snackbar.error("Copie impossible : sélectionnez le lien manuellement.");
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: name || "Mon profil Trankyl", text: "Découvrez mon profil sur Trankyl", url });
      } catch {
        // partage annule
      }
    } else copy();
  }
  function download() {
    const img = document.querySelector<HTMLImageElement>(".qrbox img");
    if (!img) return;
    const a = document.createElement("a");
    a.href = img.src;
    a.download = "trankyl-profil-qr.png";
    a.click();
  }
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Partager mon profil</h1><p class="pw-sub">Envoyez votre fiche à vos clients ou imprimez le QR code : il mène directement à vos services et à la réservation.</p></div></div>
  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else if path}
    <div class="grid">
      <section class="pw-box">
        <h2>Votre lien</h2>
        <div class="link"><input readonly value={url} onclick={(e) => e.currentTarget.select()} aria-label="Lien de mon profil" /><button class="btn btn-primary btn-sm" onclick={copy}><Copy size={15} /> Copier</button></div>
        <div class="acts">
          <button class="btn btn-outline btn-sm" onclick={share}><Share2 size={15} /> Partager</button>
          <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(text)}`}><MessageCircle size={15} /> WhatsApp</a>
          <a class="btn btn-outline btn-sm" href={path} target="_blank" rel="noopener">Voir ma fiche</a>
        </div>
        {#if !verified}<p class="pw-muted">Votre fiche n'apparaît dans l'annuaire qu'une fois votre dossier validé par l'équipe Trankyl.</p>{/if}
      </section>
      <section class="pw-box center">
        <h2>QR code</h2>
        <div class="qrbox"><QrCode value={url} size={220} label="QR code de mon profil" /></div>
        <button class="btn btn-outline btn-sm" onclick={download}><Download size={15} /> Télécharger</button>
      </section>
    </div>
  {/if}
</div>

<style>
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 1rem; align-items: start; }
  .link { display: flex; gap: 0.5rem; } .link input { flex: 1; min-width: 0; padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; background: #f9fafb; }
  .acts { display: flex; flex-wrap: wrap; gap: 0.5rem; } .center { align-items: center; text-align: center; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
</style>
