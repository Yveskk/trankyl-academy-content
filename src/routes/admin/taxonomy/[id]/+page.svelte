<script lang="ts">
  import { page } from "$app/stores";
  import {
    adminGetMetier,
    createCompetence,
    createNiveau,
    deleteCompetence,
    deleteNiveau,
    updateNiveau,
  } from "$lib/api/taxonomy";
  import type { MetierDetail } from "$lib/api/types";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Plus from "@lucide/svelte/icons/plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  let metierId = $derived(Number($page.params.id));

  let metier = $state<MetierDetail | null>(null);
  let loading = $state(true);

  let showNewNiveau = $state(false);
  let newNiveau = $state({ numero: 1, nom: "", description: "", date_debut: "" });

  let editingNiveauId = $state<number | null>(null);
  let editNiveauForm = $state({ numero: 1, nom: "", description: "", date_debut: "" });

  let expandedNiveauId = $state<number | null>(null);
  let newCompetence = $state<Record<number, { code: string; titre: string; description: string }>>({});

  async function refresh() {
    loading = true;
    try {
      metier = await adminGetMetier(metierId);
      newNiveau.numero = metier.niveaux.length + 1;
      for (const n of metier.niveaux) {
        if (!(n.id in newCompetence)) newCompetence[n.id] = { code: "", titre: "", description: "" };
      }
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  async function handleCreateNiveau(event: SubmitEvent) {
    event.preventDefault();
    if (!metier) return;
    try {
      await createNiveau(metier.id, {
        numero: newNiveau.numero,
        nom: newNiveau.nom,
        description: newNiveau.description || undefined,
        date_debut: newNiveau.date_debut || null,
      });
      newNiveau = { numero: newNiveau.numero + 1, nom: "", description: "", date_debut: "" };
      showNewNiveau = false;
      snackbar.success("Niveau ajouté.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function startEditNiveau(niveau: MetierDetail["niveaux"][number]) {
    editingNiveauId = niveau.id;
    editNiveauForm = {
      numero: niveau.numero,
      nom: niveau.nom,
      description: niveau.description ?? "",
      date_debut: niveau.date_debut ?? "",
    };
  }

  async function handleSaveNiveau(niveauId: number, event: SubmitEvent) {
    event.preventDefault();
    try {
      await updateNiveau(niveauId, {
        numero: editNiveauForm.numero,
        nom: editNiveauForm.nom,
        description: editNiveauForm.description || undefined,
        date_debut: editNiveauForm.date_debut || null,
      });
      editingNiveauId = null;
      snackbar.success("Niveau mis à jour.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDeleteNiveau(id: number) {
    if (!confirm("Supprimer ce niveau et ses compétences ?")) return;
    try {
      await deleteNiveau(id);
      snackbar.success("Niveau supprimé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function toggleCompetences(niveauId: number) {
    expandedNiveauId = expandedNiveauId === niveauId ? null : niveauId;
  }

  async function handleCreateCompetence(niveauId: number, event: SubmitEvent) {
    event.preventDefault();
    const form = newCompetence[niveauId];
    try {
      await createCompetence(niveauId, { code: form.code, titre: form.titre, description: form.description || undefined });
      newCompetence[niveauId] = { code: "", titre: "", description: "" };
      snackbar.success("Compétence ajoutée.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDeleteCompetence(id: number) {
    if (!confirm("Supprimer cette compétence ?")) return;
    try {
      await deleteCompetence(id);
      snackbar.success("Compétence supprimée.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
</script>

<div class="niveaux-page">
  <a class="back-link" href="/admin/taxonomy"><ArrowLeft size={15} /> Tous les métiers</a>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if !metier}
    <div class="empty-state">Métier introuvable.</div>
  {:else}
    <div class="page-header">
      <div>
        <h2>{metier.nom}</h2>
        <p class="header-desc">{metier.code}{#if metier.description} — {metier.description}{/if}</p>
      </div>
      <button class="btn-add" onclick={() => (showNewNiveau = !showNewNiveau)}>
        <Plus size={16} />
        Nouveau niveau
      </button>
    </div>

    {#if showNewNiveau}
      <div class="form-card">
        <h3>Ajouter un niveau</h3>
        <form onsubmit={handleCreateNiveau}>
          <div class="form-grid-4">
            <div class="field">
              <label for="new-niveau-numero">Numéro</label>
              <input id="new-niveau-numero" type="number" bind:value={newNiveau.numero} required />
            </div>
            <div class="field">
              <label for="new-niveau-nom">Nom</label>
              <input id="new-niveau-nom" placeholder="ex: Bases" bind:value={newNiveau.nom} required />
            </div>
            <div class="field">
              <label for="new-niveau-desc">Description</label>
              <input id="new-niveau-desc" placeholder="Optionnel" bind:value={newNiveau.description} />
            </div>
            <div class="field">
              <label for="new-niveau-date">Date de début</label>
              <input id="new-niveau-date" type="date" bind:value={newNiveau.date_debut} />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary-sm" type="submit">Ajouter</button>
            <button class="btn-cancel" type="button" onclick={() => (showNewNiveau = false)}>Annuler</button>
          </div>
        </form>
      </div>
    {/if}

    {#if metier.niveaux.length === 0}
      <div class="empty-state">Aucun niveau pour ce métier.</div>
    {:else}
      <div class="table-wrap">
        <table class="niveaux-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Nom</th>
              <th>Date de début</th>
              <th>Compétences</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each metier.niveaux as niveau}
              <tr>
                <td>{niveau.numero}</td>
                <td>{niveau.nom}</td>
                <td>
                  <span class="date-pill" class:muted={!niveau.date_debut}>{formatDate(niveau.date_debut)}</span>
                </td>
                <td>
                  <button class="comp-toggle" onclick={() => toggleCompetences(niveau.id)}>
                    {niveau.competences.length} compétence(s)
                    <ChevronDown size={13} class={expandedNiveauId === niveau.id ? "chevron rotated" : "chevron"} />
                  </button>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="btn-icon" title="Modifier" onclick={() => startEditNiveau(niveau)}>
                      <Pencil size={15} />
                    </button>
                    <button class="btn-icon danger" title="Supprimer" onclick={() => handleDeleteNiveau(niveau.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>

              {#if editingNiveauId === niveau.id}
                <tr class="detail-row">
                  <td colspan="5">
                    <form class="edit-niveau-form" onsubmit={(e) => handleSaveNiveau(niveau.id, e)}>
                      <div class="form-grid-4">
                        <div class="field">
                          <label for="edit-niveau-numero-{niveau.id}">Numéro</label>
                          <input id="edit-niveau-numero-{niveau.id}" type="number" bind:value={editNiveauForm.numero} required />
                        </div>
                        <div class="field">
                          <label for="edit-niveau-nom-{niveau.id}">Nom</label>
                          <input id="edit-niveau-nom-{niveau.id}" bind:value={editNiveauForm.nom} required />
                        </div>
                        <div class="field">
                          <label for="edit-niveau-desc-{niveau.id}">Description</label>
                          <input id="edit-niveau-desc-{niveau.id}" bind:value={editNiveauForm.description} />
                        </div>
                        <div class="field">
                          <label for="edit-niveau-date-{niveau.id}">Date de début</label>
                          <input id="edit-niveau-date-{niveau.id}" type="date" bind:value={editNiveauForm.date_debut} />
                        </div>
                      </div>
                      <div class="form-actions">
                        <button class="btn-primary-sm" type="submit">Enregistrer</button>
                        <button class="btn-cancel" type="button" onclick={() => (editingNiveauId = null)}>Annuler</button>
                      </div>
                    </form>
                  </td>
                </tr>
              {/if}

              {#if expandedNiveauId === niveau.id}
                <tr class="detail-row">
                  <td colspan="5">
                    {#if niveau.competences.length > 0}
                      <div class="competences-grid">
                        {#each niveau.competences as comp}
                          <div class="competence-chip">
                            <span class="comp-titre">{comp.titre}</span>
                            <span class="comp-code">{comp.code}</span>
                            <button class="btn-icon-danger-xs" onclick={() => handleDeleteCompetence(comp.id)} title="Supprimer">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="no-items">Aucune compétence pour ce niveau.</p>
                    {/if}

                    {#if newCompetence[niveau.id]}
                      <form class="add-competence-form" onsubmit={(e) => handleCreateCompetence(niveau.id, e)}>
                        <div class="form-grid-3">
                          <div class="field">
                            <label for="new-comp-code-{niveau.id}">Code</label>
                            <input id="new-comp-code-{niveau.id}" placeholder="ex: nounou_hygiene" bind:value={newCompetence[niveau.id].code} required />
                          </div>
                          <div class="field">
                            <label for="new-comp-titre-{niveau.id}">Titre</label>
                            <input id="new-comp-titre-{niveau.id}" placeholder="Titre de la compétence" bind:value={newCompetence[niveau.id].titre} required />
                          </div>
                          <div class="field">
                            <label for="new-comp-desc-{niveau.id}">Description</label>
                            <input id="new-comp-desc-{niveau.id}" placeholder="Optionnel" bind:value={newCompetence[niveau.id].description} />
                          </div>
                        </div>
                        <button class="btn-add-sm" type="submit">Ajouter la compétence</button>
                      </form>
                    {/if}
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .niveaux-page { display: flex; flex-direction: column; gap: 1rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; color: #6b7280; width: fit-content; }
  .back-link:hover { color: #03a71a; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-header h2 { margin: 0 0 0.2rem; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .btn-add { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; flex-shrink: 0; }
  .btn-add:hover { background: #028a15; }
  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
  .form-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 1rem; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
  .form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  input { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #f9fafb; color: #111827; transition: all 0.15s; }
  input:focus { outline: none; border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1); }
  .form-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  .btn-primary-sm { padding: 0.5rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .btn-cancel { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #374151; font-family: inherit; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
  .btn-add-sm { padding: 0.45rem 0.9rem; border: 1px dashed #03a71a; border-radius: 8px; background: #ecfdf5; color: #047857; font-family: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; margin-top: 0.75rem; }

  .table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; overflow-x: auto; }
  .niveaux-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .niveaux-table th { text-align: left; padding: 0.75rem 1rem; background: #f9fafb; color: #6b7280; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
  .niveaux-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  .date-pill { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: #fff3cc; color: #8a6800; }
  .date-pill.muted { background: #f3f4f6; color: #9ca3af; }
  .comp-toggle { display: inline-flex; align-items: center; gap: 0.3rem; border: none; background: none; color: #374151; font-family: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0; }
  .comp-toggle:hover { color: #03a71a; }
  .comp-toggle :global(.chevron) { transition: transform 0.2s; }
  .comp-toggle :global(.chevron.rotated) { transform: rotate(180deg); }
  .row-actions { display: flex; align-items: center; gap: 0.3rem; }
  .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; border-radius: 7px; background: #f3f4f6; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .btn-icon:hover { background: #e5e7eb; color: #111827; }
  .btn-icon.danger:hover { background: #fef2f2; color: #dc2626; }
  .detail-row td { background: #fafbfa; border-bottom: 2px solid #03a71a; padding: 1.25rem; }
  .edit-niveau-form { margin: 0; }
  .competences-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .competence-chip { display: flex; align-items: center; padding: 0.5rem 0.75rem; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
  .comp-titre { font-size: 0.82rem; font-weight: 700; color: #111827; }
  .comp-code { font-size: 0.7rem; color: #9ca3af; font-weight: 600; margin: 0 0.3rem; }
  .btn-icon-danger-xs { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; border-radius: 4px; background: transparent; color: #d1d5db; cursor: pointer; transition: all 0.15s; margin-left: 0.3rem; }
  .btn-icon-danger-xs:hover { background: #fef2f2; color: #dc2626; }
  .no-items { font-size: 0.82rem; color: #9ca3af; font-style: italic; margin: 0; }
  .add-competence-form { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #d1d5db; }
  .loading-state, .empty-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
  @media (max-width: 900px) { .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; } }
</style>
