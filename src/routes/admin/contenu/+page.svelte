<script lang="ts">
  import { adminGetSection, adminUpsertSection } from "$lib/api/content";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";

  const SECTION_KEY = "home_careers";

  let title = $state("");
  let subtitle = $state("");
  let isActive = $state(true);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let saved = $state(false);

  async function load() {
    loading = true;
    error = null;
    try {
      const section = await adminGetSection(SECTION_KEY);
      title = section.title;
      subtitle = section.subtitle ?? "";
      isActive = section.is_active;
    } catch {
      // Pas encore configuree : on part d'un formulaire vide, is_active par defaut a true.
      title = "";
      subtitle = "";
      isActive = true;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    load();
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    saved = false;
    error = null;
    try {
      await adminUpsertSection(SECTION_KEY, { title, subtitle: subtitle || undefined, is_active: isActive });
      saved = true;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="content-page">
  <div class="page-header">
    <div>
      <p class="header-desc">
        Bloc de texte affiche sur la page d'accueil, juste au-dessus de la liste des metiers.
      </p>
    </div>
  </div>

  {#if error}<div class="alert-error">{error}</div>{/if}

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else}
    <div class="form-card">
      <div class="card-title-row">
        <h3>Section "Nos parcours" (page d'accueil)</h3>
        <span class="status-pill" class:active={isActive}>
          {#if isActive}<Eye size={13} />Visible sur le site{:else}<EyeOff size={13} />Masquee du site{/if}
        </span>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="field">
          <label for="section-title">Titre</label>
          <input id="section-title" bind:value={title} required />
        </div>
        <div class="field">
          <label for="section-subtitle">Sous-titre</label>
          <textarea id="section-subtitle" bind:value={subtitle} rows="3"></textarea>
        </div>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={isActive} />
          Afficher cette section sur le site public
        </label>

        <div class="form-actions">
          <button class="btn-primary-sm" type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {#if saved}<span class="saved-hint">Enregistre.</span>{/if}
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .content-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; max-width: 640px; }
  .card-title-row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .form-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0; }
  .status-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; padding: 0.3rem 0.65rem; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
  .status-pill.active { background: #ecfdf5; color: #047857; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.9rem; }
  label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  input, textarea { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #f9fafb; color: #111827; transition: all 0.15s; }
  textarea { resize: vertical; }
  input:focus, textarea:focus { outline: none; border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1); }
  .toggle-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #374151; cursor: pointer; margin-bottom: 1rem; }
  .toggle-row input { width: auto; padding: 0; }
  .form-actions { display: flex; align-items: center; gap: 0.75rem; }
  .btn-primary-sm { padding: 0.5rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .btn-primary-sm:hover:not(:disabled) { background: #028a15; }
  .btn-primary-sm:disabled { opacity: 0.6; cursor: not-allowed; }
  .saved-hint { font-size: 0.8rem; color: #047857; font-weight: 600; }
  .alert-error { padding: 0.7rem 1rem; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; font-weight: 600; border: 1px solid #fecaca; }
  .loading-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; }
</style>
