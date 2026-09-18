<script lang="ts">
  import { onMount } from "svelte";
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
  // Cle composee "ordre-cible" (ex: "1-desktop", "1-mobile") : deux zones
  // d'upload distinctes peuvent etre actives independamment par slot.
  let uploadingKey = $state<string | null>(null);

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

  onMount(() => {
    refresh();
  });

  async function handleAddForSlot(event: Event, ordre: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingKey = `${ordre}-desktop`;
    try {
      const { url } = await uploadBannerImage(file);
      await createBanner({ ordre, image_url: url });
      snackbar.success(`Bannière ${ordre} ajoutée.`);
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      uploadingKey = null;
      input.value = "";
    }
  }

  async function handleReplace(event: Event, banner: Banner, target: "desktop" | "mobile") {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingKey = `${banner.ordre}-${target}`;
    try {
      const { url } = await uploadBannerImage(file);
      await updateBanner(banner.id, {
        ordre: banner.ordre,
        image_url: target === "desktop" ? url : banner.image_url,
        image_url_mobile: target === "mobile" ? url : banner.image_url_mobile,
        is_active: banner.is_active,
      });
      snackbar.success(`Image ${target === "desktop" ? "desktop" : "mobile"} de la bannière ${banner.ordre} mise à jour.`);
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      uploadingKey = null;
      input.value = "";
    }
  }

  async function handleRemoveMobile(banner: Banner) {
    try {
      await updateBanner(banner.id, {
        ordre: banner.ordre,
        image_url: banner.image_url,
        image_url_mobile: null,
        is_active: banner.is_active,
      });
      snackbar.success("Image mobile retirée — l'image desktop sera utilisée sur mobile.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      await updateBanner(banner.id, {
        ordre: banner.ordre,
        image_url: banner.image_url,
        image_url_mobile: banner.image_url_mobile,
        is_active: !banner.is_active,
      });
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
    Chaque emplacement a une image <strong>desktop</strong> (obligatoire, 1920×660px conseillé) et une
    image <strong>mobile</strong> optionnelle (1080×1440px conseillé, cadrage portrait) — sans image
    mobile, l'image desktop est réutilisée et simplement recadrée.
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
            <div class="slot-group">
              <span class="slot-group-label">Desktop (1920×660)</span>
              <div class="slot-preview" class:inactive={!banner.is_active}>
                <img src={banner.image_url} alt="Bannière {ordre} desktop" />
                {#if !banner.is_active}<span class="inactive-overlay">Masquée</span>{/if}
              </div>
              <div class="slot-actions">
                <label class="btn-icon" class:disabled={uploadingKey === `${ordre}-desktop`} title="Remplacer l'image desktop">
                  {#if uploadingKey === `${ordre}-desktop`}<Loader size={15} class="spin" />{:else}<ImagePlus size={15} />{/if}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingKey === `${ordre}-desktop`} onchange={(e) => handleReplace(e, banner, "desktop")} />
                </label>
                <button class="btn-icon" title={banner.is_active ? "Masquer (revenir à l'image par défaut)" : "Réactiver"} onclick={() => handleToggleActive(banner)}>
                  {#if banner.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
                </button>
                <button class="btn-icon danger" title="Supprimer tout l'emplacement" onclick={() => handleDelete(banner)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div class="slot-group">
              <span class="slot-group-label">Mobile (1080×1440, optionnel)</span>
              {#if banner.image_url_mobile}
                <div class="slot-preview slot-preview-mobile" class:inactive={!banner.is_active}>
                  <img src={banner.image_url_mobile} alt="Bannière {ordre} mobile" />
                </div>
                <div class="slot-actions">
                  <label class="btn-icon" class:disabled={uploadingKey === `${ordre}-mobile`} title="Remplacer l'image mobile">
                    {#if uploadingKey === `${ordre}-mobile`}<Loader size={15} class="spin" />{:else}<ImagePlus size={15} />{/if}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingKey === `${ordre}-mobile`} onchange={(e) => handleReplace(e, banner, "mobile")} />
                  </label>
                  <button class="btn-icon danger" title="Retirer l'image mobile" onclick={() => handleRemoveMobile(banner)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              {:else}
                <label class="slot-empty slot-empty-mobile" class:disabled={uploadingKey === `${ordre}-mobile`}>
                  {#if uploadingKey === `${ordre}-mobile`}
                    <Loader size={18} class="spin" />
                    <span>Envoi en cours...</span>
                  {:else}
                    <Plus size={18} />
                    <span>Ajouter (optionnel)</span>
                  {/if}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingKey === `${ordre}-mobile`} onchange={(e) => handleReplace(e, banner, "mobile")} />
                </label>
              {/if}
            </div>
          {:else}
            <label class="slot-empty" class:disabled={uploadingKey === `${ordre}-desktop`}>
              {#if uploadingKey === `${ordre}-desktop`}
                <Loader size={22} class="spin" />
                <span>Envoi en cours...</span>
              {:else}
                <Plus size={22} />
                <span>Ajouter une image desktop</span>
              {/if}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingKey === `${ordre}-desktop`} onchange={(e) => handleAddForSlot(e, ordre)} />
            </label>
            <p class="slot-hint">Image par défaut du site affichée ici. L'image mobile pourra être ajoutée une fois l'image desktop envoyée.</p>
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

  .banner-slot { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.9rem; }
  .slot-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }

  .slot-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .slot-group-label { font-size: 0.7rem; font-weight: 700; color: #6b7280; }

  .slot-preview { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background: #f3f4f6; }
  .slot-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .slot-preview.inactive img { opacity: 0.45; }
  .slot-preview-mobile { aspect-ratio: 3/4; max-width: 140px; }
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
  .slot-empty-mobile { aspect-ratio: 3/4; max-width: 140px; padding: 0.75rem; }
  .slot-hint { font-size: 0.72rem; color: #9ca3af; margin: 0; text-align: center; }

  :global(.banner-admin-page .spin) { animation: banner-spin 1s linear infinite; }
  @keyframes banner-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .banner-grid { grid-template-columns: 1fr; }
  }
</style>
