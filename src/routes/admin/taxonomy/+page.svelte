<script lang="ts">
  import { goto } from "$app/navigation";
  import { adminListMetiers, createMetier, deleteMetier, updateMetier } from "$lib/api/taxonomy";
  import type { Metier } from "$lib/api/types";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Info from "@lucide/svelte/icons/info";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Baby from "@lucide/svelte/icons/baby";
  import House from "@lucide/svelte/icons/house";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import SprayCan from "@lucide/svelte/icons/spray-can";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";

  let metiers = $state<Metier[]>([]);
  let loading = $state(true);

  let newMetier = $state({ code: "", nom: "", description: "", nom_en: "", description_en: "" });
  let showNewMetier = $state(false);

  let editingMetierId = $state<number | null>(null);
  let editMetierForm = $state({ code: "", nom: "", description: "", nom_en: "", description_en: "" });

  const iconByCode: Record<string, any> = {
    nounou: Baby,
    "aide-domicile": House,
    cuisinier: ChefHat,
    "agent-entretien": SprayCan,
  };

  async function refresh() {
    loading = true;
    try {
      metiers = await adminListMetiers();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  async function handleCreateMetier(event: SubmitEvent) {
    event.preventDefault();
    try {
      await createMetier({
        code: newMetier.code,
        nom: newMetier.nom,
        description: newMetier.description || undefined,
        nom_en: newMetier.nom_en || undefined,
        description_en: newMetier.description_en || undefined,
      });
      newMetier = { code: "", nom: "", description: "", nom_en: "", description_en: "" };
      showNewMetier = false;
      snackbar.success("Métier créé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function startEditMetier(metier: Metier) {
    editingMetierId = metier.id;
    editMetierForm = {
      code: metier.code,
      nom: metier.nom,
      description: metier.description ?? "",
      nom_en: metier.nom_en ?? "",
      description_en: metier.description_en ?? "",
    };
  }

  async function handleSaveMetier(metier: Metier, event: SubmitEvent) {
    event.preventDefault();
    try {
      await updateMetier(metier.id, {
        code: editMetierForm.code,
        nom: editMetierForm.nom,
        description: editMetierForm.description || undefined,
        nom_en: editMetierForm.nom_en || undefined,
        description_en: editMetierForm.description_en || undefined,
        is_active: metier.is_active,
      });
      editingMetierId = null;
      snackbar.success("Métier mis à jour.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleToggleActive(metier: Metier) {
    try {
      await updateMetier(metier.id, {
        code: metier.code,
        nom: metier.nom,
        description: metier.description ?? undefined,
        nom_en: metier.nom_en ?? undefined,
        description_en: metier.description_en ?? undefined,
        is_active: !metier.is_active,
      });
      snackbar.success(metier.is_active ? "Métier désactivé." : "Métier activé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDeleteMetier(id: number) {
    if (!confirm("Supprimer ce métier et toutes ses données ?")) return;
    try {
      await deleteMetier(id);
      snackbar.success("Métier supprimé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
</script>

<div class="taxonomy-page">
  <div class="page-header">
    <div>
      <p class="header-desc">Référentiel des métiers. Cliquez sur "Détails" pour gérer les niveaux et compétences d'un métier.</p>
    </div>
    <button class="btn-add" onclick={() => (showNewMetier = !showNewMetier)}>
      <Plus size={16} />
      Nouveau métier
    </button>
  </div>

  {#if showNewMetier}
    <div class="form-card">
      <h3>Créer un métier</h3>
      <form onsubmit={handleCreateMetier}>
        <div class="form-grid">
          <div class="field">
            <label for="metier-code">Code</label>
            <input id="metier-code" placeholder="ex: nounou" bind:value={newMetier.code} required />
          </div>
          <div class="field">
            <label for="metier-nom">Nom</label>
            <input id="metier-nom" placeholder="ex: Nounou" bind:value={newMetier.nom} required />
          </div>
        </div>
        <div class="field">
          <label for="metier-desc">Description (FR)</label>
          <input id="metier-desc" placeholder="Description du métier" bind:value={newMetier.description} />
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="metier-nom-en">Name (EN)</label>
            <input id="metier-nom-en" placeholder="e.g. Nanny" bind:value={newMetier.nom_en} />
          </div>
          <div class="field">
            <label for="metier-desc-en">Description (EN)</label>
            <input id="metier-desc-en" placeholder="Job description" bind:value={newMetier.description_en} />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary-sm" type="submit">Créer</button>
          <button class="btn-cancel" type="button" onclick={() => (showNewMetier = false)}>Annuler</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if metiers.length === 0}
    <div class="empty-state">Aucun métier créé.</div>
  {:else}
    <div class="table-wrap">
      <table class="metiers-table">
        <thead>
          <tr>
            <th>Métier</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each metiers as metier}
            {@const Icon = iconByCode[metier.code] ?? GraduationCap}
            <tr class:inactive-row={!metier.is_active}>
              <td>
                <div class="metier-cell">
                  <span class="metier-icon"><Icon size={18} /></span>
                  <div>
                    <span class="metier-nom">{metier.nom}</span>
                    <span class="metier-code">{metier.code}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="status-pill" class:active={metier.is_active}>{metier.is_active ? "Actif" : "Inactif"}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon" title="Modifier" onclick={() => startEditMetier(metier)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    class="btn-icon"
                    title={metier.is_active ? "Désactiver (masquer du site)" : "Activer (afficher sur le site)"}
                    onclick={() => handleToggleActive(metier)}
                  >
                    {#if metier.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
                  </button>
                  <button class="btn-icon" title="Détails" onclick={() => goto(`/admin/taxonomy/${metier.id}`)}>
                    <Info size={15} />
                  </button>
                  <button class="btn-icon danger" title="Supprimer" onclick={() => handleDeleteMetier(metier.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>

            {#if editingMetierId === metier.id}
              <tr class="detail-row">
                <td colspan="3">
                  <form class="edit-metier-form" onsubmit={(e) => handleSaveMetier(metier, e)}>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-metier-code">Code</label>
                        <input id="edit-metier-code" bind:value={editMetierForm.code} required />
                      </div>
                      <div class="field">
                        <label for="edit-metier-nom">Nom</label>
                        <input id="edit-metier-nom" bind:value={editMetierForm.nom} required />
                      </div>
                    </div>
                    <div class="field">
                      <label for="edit-metier-desc">Description (FR)</label>
                      <input id="edit-metier-desc" bind:value={editMetierForm.description} />
                    </div>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-metier-nom-en">Name (EN)</label>
                        <input id="edit-metier-nom-en" bind:value={editMetierForm.nom_en} />
                      </div>
                      <div class="field">
                        <label for="edit-metier-desc-en">Description (EN)</label>
                        <input id="edit-metier-desc-en" bind:value={editMetierForm.description_en} />
                      </div>
                    </div>
                    <div class="form-actions">
                      <button class="btn-primary-sm" type="submit">Enregistrer</button>
                      <button class="btn-cancel" type="button" onclick={() => (editingMetierId = null)}>Annuler</button>
                    </div>
                  </form>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .taxonomy-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .btn-add { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  .btn-add:hover { background: #028a15; }
  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
  .form-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 1rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  input { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #f9fafb; color: #111827; transition: all 0.15s; }
  input:focus { outline: none; border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1); }
  .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .btn-primary-sm { padding: 0.5rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .btn-cancel { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #374151; font-family: inherit; font-weight: 600; font-size: 0.82rem; cursor: pointer; }

  .table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; overflow-x: auto; }
  .metiers-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .metiers-table th { text-align: left; padding: 0.75rem 1rem; background: #f9fafb; color: #6b7280; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
  .metiers-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  .metiers-table tr.inactive-row td { opacity: 0.55; }
  .metier-cell { display: flex; align-items: center; gap: 0.65rem; }
  .metier-icon { width: 34px; height: 34px; border-radius: 8px; background: #ecfdf5; color: #047857; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .metier-nom { display: block; font-weight: 700; color: #111827; }
  .metier-code { display: block; font-size: 0.72rem; color: #9ca3af; font-weight: 600; }
  .status-pill { display: inline-flex; font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
  .status-pill.active { background: #ecfdf5; color: #047857; }
  .row-actions { display: flex; align-items: center; gap: 0.3rem; }
  .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; border-radius: 7px; background: #f3f4f6; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .btn-icon:hover { background: #e5e7eb; color: #111827; }
  .btn-icon.danger:hover { background: #fef2f2; color: #dc2626; }
  .detail-row td { background: #fafbfa; border-bottom: 2px solid #03a71a; padding: 1.25rem; }
  .edit-metier-form { margin: 0; }
  .loading-state, .empty-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; }
  @media (max-width: 900px) { .form-grid { grid-template-columns: 1fr; } }
</style>
