<script lang="ts">
  import { adminListBanners, createBanner, deleteBanner, updateBanner, uploadBannerImage } from "$lib/api/banners";
  import type { Banner } from "$lib/api/types";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Loader from "@lucide/svelte/icons/loader";

  let banners = $state<Banner[]>([]);
  let loading = $state(true);
  let uploadingSlot = $state<number | null>(null);

  async function refresh() {
    loading = true;
    try {
      banners = await adminListBanners();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  async function handleAddForSlot(event: Event, ordre: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingSlot = ordre;
    try {
      const { url } = await uploadBannerImage(file);
      await createBanner({ ordre, image_url: url });
      snackbar.success(`Bannière ${ordre} ajoutée.`);
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      uploadingSlot = null;
      input.value = "";
    }
  }

  async function handleReplace(event: Event, banner: Banner) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingSlot = banner.ordre;
    try {
      const { url } = await uploadBannerImage(file);
      await updateBanner(banner.id, { ordre: banner.ordre, image_url: url, is_active: banner.is_active });
      snackbar.success(`Bannière ${banner.ordre} remplacée.`);
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      uploadingSlot = null;
      input.value = "";
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      await updateBanner(banner.id, { ordre: banner.ordre, image_url: banner.image_url, is_active: !banner.is_active });
      snackbar.success(banner.is_active ? "Bannière masquée (image par défaut réaffichée)." : "Bannière réactivée.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Supprimer la bannière ${banner.ordre} ? L'image par défaut reprendra sa place.`)) return;
    try {
      await deleteBanner(banner.id);
      snackbar.success("Bannière supprimée.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
</script>

<div class="banner-admin-page">
  <p class="header-desc">
    Images du carrousel de la page d'accueil (3 emplacements maximum). Tant qu'aucune image n'est
    ajoutée pour un emplacement, l'image par défaut du site s'affiche à sa place — rien ne casse.
  </p>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else}
    <div class="banner-grid">
      {#each [1, 2, 3] as ordre}
        {@const banner = banners.find((b) => b.ordre === ordre)}
        <div class="banner-slot">
          <span class="slot-label">Emplacement {ordre}</span>
          {#if banner}
            <div class="slot-preview" class:inactive={!banner.is_active}>
              <img src={banner.image_url} alt="Bannière {ordre}" />
              {#if !banner.is_active}<span class="inactive-overlay">Masquée</span>{/if}
            </div>
            <div class="slot-actions">
              <label class="btn-icon" class:disabled={uploadingSlot === ordre} title="Remplacer l'image">
                {#if uploadingSlot === ordre}<Loader size={15} class="spin" />{:else}<ImagePlus size={15} />{/if}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingSlot === ordre} onchange={(e) => handleReplace(e, banner)} />
              </label>
              <button class="btn-icon" title={banner.is_active ? "Masquer (revenir à l'image par défaut)" : "Réactiver"} onclick={() => handleToggleActive(banner)}>
                {#if banner.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
              </button>
              <button class="btn-icon danger" title="Supprimer" onclick={() => handleDelete(banner)}>
                <Trash2 size={15} />
              </button>
            </div>
          {:else}
            <label class="slot-empty" class:disabled={uploadingSlot === ordre}>
              {#if uploadingSlot === ordre}
                <Loader size={22} class="spin" />
                <span>Envoi en cours...</span>
              {:else}
                <Plus size={22} />
                <span>Ajouter une image</span>
              {/if}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingSlot === ordre} onchange={(e) => handleAddForSlot(e, ordre)} />
            </label>
            <p class="slot-hint">Image par défaut du site affichée ici.</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .banner-admin-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; max-width: 640px; }
  .loading-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; }

  .banner-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }

  .banner-slot { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .slot-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }

  .slot-preview { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background: #f3f4f6; }
  .slot-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .slot-preview.inactive img { opacity: 0.45; }
  .inactive-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700; color: #374151; background: rgba(255,255,255,0.5); }

  .slot-actions { display: flex; align-items: center; gap: 0.4rem; }
  .btn-icon { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: 7px; background: #f3f4f6; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .btn-icon:hover { background: #e5e7eb; color: #111827; }
  .btn-icon.danger:hover { background: #fef2f2; color: #dc2626; }
  .btn-icon.disabled { cursor: wait; opacity: 0.7; }
  .btn-icon input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  .slot-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem;
    aspect-ratio: 16/9; border: 1.5px dashed #d1d5db; border-radius: 8px; background: #f9fafb;
    color: #6b7280; font-size: 0.8rem; font-weight: 600; cursor: pointer; position: relative; transition: all 0.15s;
  }
  .slot-empty:hover { border-color: #03a71a; color: #028a15; background: #f0fdf4; }
  .slot-empty.disabled { cursor: wait; opacity: 0.7; }
  .slot-empty input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .slot-hint { font-size: 0.72rem; color: #9ca3af; margin: 0; text-align: center; }

  :global(.banner-admin-page .spin) { animation: banner-spin 1s linear infinite; }
  @keyframes banner-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .banner-grid { grid-template-columns: 1fr; }
  }
</style>
