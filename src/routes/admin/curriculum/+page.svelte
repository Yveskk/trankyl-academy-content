<script lang="ts">
  import { createModule, createQuiz, deleteModule, listModules, updateModule } from "$lib/api/curriculum";
  import { getMetier, listMetiers } from "$lib/api/taxonomy";
  import type { ModuleItem } from "$lib/api/types";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Award from "@lucide/svelte/icons/award";
  import Clock from "@lucide/svelte/icons/clock";
  import BookOpen from "@lucide/svelte/icons/book-open";

  interface CompetenceOption {
    id: number;
    label: string;
  }

  let allCompetences = $state<CompetenceOption[]>([]);
  let selectedCompetenceId = $state<number | null>(null);
  let modules = $state<ModuleItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let newModule = $state({ code: "", titre: "", contenu: "", titre_en: "", contenu_en: "", duree_heures: 2 });
  let showNewModule = $state(false);

  let editingModuleId = $state<number | null>(null);
  let editModule = $state({ code: "", titre: "", contenu: "", titre_en: "", contenu_en: "", duree_heures: 2, ordre: 0 });

  let quizModuleId = $state<number | null>(null);
  let quizTitre = $state("");
  let quizSeuil = $state(70);
  let questions = $state<{ texte: string; choix: { texte: string; est_correct: boolean }[] }[]>([]);

  async function loadCompetences() {
    loading = true;
    error = null;
    try {
      const list = await listMetiers();
      const details = await Promise.all(list.map((m) => getMetier(m.code)));
      allCompetences = details.flatMap((m) =>
        m.niveaux.flatMap((n) =>
          n.competences.map((c) => ({ id: c.id, label: `${m.nom} / Niveau ${n.numero} / ${c.titre}` }))
        )
      );
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function loadModules() {
    if (selectedCompetenceId === null) { modules = []; return; }
    modules = await listModules(selectedCompetenceId);
  }

  $effect(() => { loadCompetences(); });
  $effect(() => { loadModules(); });

  async function handleAddModule(event: SubmitEvent) {
    event.preventDefault();
    if (selectedCompetenceId === null) return;
    error = null;
    try {
      await createModule({
        competence_id: selectedCompetenceId,
        code: newModule.code,
        titre: newModule.titre,
        contenu: newModule.contenu || undefined,
        titre_en: newModule.titre_en || undefined,
        contenu_en: newModule.contenu_en || undefined,
        duree_heures: newModule.duree_heures,
      });
      newModule = { code: "", titre: "", contenu: "", titre_en: "", contenu_en: "", duree_heures: 2 };
      showNewModule = false;
      await loadModules();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function handleDeleteModule(id: number) {
    error = null;
    try {
      await deleteModule(id);
      await loadModules();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function startEditModule(m: ModuleItem) {
    editingModuleId = m.id;
    editModule = {
      code: m.code,
      titre: m.titre,
      contenu: m.contenu ?? "",
      titre_en: m.titre_en ?? "",
      contenu_en: m.contenu_en ?? "",
      duree_heures: m.duree_heures,
      ordre: m.ordre,
    };
  }

  async function handleSaveModule(moduleId: number, event: SubmitEvent) {
    event.preventDefault();
    error = null;
    try {
      await updateModule(moduleId, {
        code: editModule.code,
        titre: editModule.titre,
        contenu: editModule.contenu || undefined,
        titre_en: editModule.titre_en || undefined,
        contenu_en: editModule.contenu_en || undefined,
        duree_heures: editModule.duree_heures,
        ordre: editModule.ordre,
      });
      editingModuleId = null;
      await loadModules();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function startQuiz(moduleId: number) {
    quizModuleId = moduleId;
    quizTitre = "";
    quizSeuil = 70;
    questions = [{ texte: "", choix: [{ texte: "", est_correct: true }, { texte: "", est_correct: false }] }];
  }

  function addQuestion() {
    questions.push({ texte: "", choix: [{ texte: "", est_correct: true }, { texte: "", est_correct: false }] });
  }

  function removeQuestion(i: number) { questions.splice(i, 1); }
  function addChoice(qi: number) { questions[qi].choix.push({ texte: "", est_correct: false }); }
  function removeChoice(qi: number, ci: number) { questions[qi].choix.splice(ci, 1); }
  function setCorrect(qi: number, ci: number) { questions[qi].choix.forEach((c, i) => (c.est_correct = i === ci)); }

  async function handleCreateQuiz(event: SubmitEvent) {
    event.preventDefault();
    if (quizModuleId === null) return;
    error = null;
    try {
      await createQuiz({
        module_id: quizModuleId,
        titre: quizTitre,
        seuil_reussite_pct: quizSeuil,
        questions: questions.map((q, i) => ({
          texte: q.texte, ordre: i,
          choix: q.choix.map((c, j) => ({ texte: c.texte, est_correct: c.est_correct, ordre: j })),
        })),
      });
      quizModuleId = null;
      await loadModules();
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<div class="curriculum-page">
  <div class="page-header">
    <div>
      <p class="header-desc">Modules de formation et quiz de fin de module.</p>
    </div>
  </div>

  {#if error}
    <div class="alert-error">{error}</div>
  {/if}

  <!-- Competence Selector -->
  <div class="selector-card">
    <label for="competence">Sélectionner une compétence</label>
    <select id="competence" bind:value={selectedCompetenceId}>
      <option value={null}>-- choisir une compétence --</option>
      {#each allCompetences as c}
        <option value={c.id}>{c.label}</option>
      {/each}
    </select>
  </div>

  {#if selectedCompetenceId !== null}
    <!-- Add Module -->
    <div class="section-header">
      <h2><BookOpen size={18} /> Modules</h2>
      <button class="btn-add" onclick={() => (showNewModule = !showNewModule)}>
        <Plus size={16} />
        Nouveau module
      </button>
    </div>

    {#if showNewModule}
      <div class="form-card">
        <form onsubmit={handleAddModule}>
          <div class="form-grid">
            <div class="field">
              <label>Code</label>
              <input placeholder="ex: nounou_hygiene_m1" bind:value={newModule.code} required />
            </div>
            <div class="field">
              <label>Titre</label>
              <input placeholder="Titre du module" bind:value={newModule.titre} required />
            </div>
            <div class="field">
              <label>Durée (heures)</label>
              <input type="number" step="0.5" bind:value={newModule.duree_heures} />
            </div>
          </div>
          <div class="field">
            <label>Contenu (FR)</label>
            <textarea placeholder="Description du contenu du module..." bind:value={newModule.contenu}></textarea>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="new-module-titre-en">Titre (EN)</label>
              <input id="new-module-titre-en" placeholder="Module title" bind:value={newModule.titre_en} />
            </div>
          </div>
          <div class="field">
            <label for="new-module-contenu-en">Contenu (EN)</label>
            <textarea id="new-module-contenu-en" placeholder="Module content description..." bind:value={newModule.contenu_en}></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-primary-sm" type="submit">Ajouter</button>
            <button class="btn-cancel" type="button" onclick={() => (showNewModule = false)}>Annuler</button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Modules List -->
    {#if modules.length > 0}
      <div class="modules-grid">
        {#each modules as m}
          <div class="module-card">
            <div class="module-header">
              <h3>{m.titre}</h3>
              <div class="module-badges">
                <span class="badge-muted"><Clock size={11} /> {m.duree_heures}h</span>
                {#if m.has_quiz}
                  <span class="badge-gold"><Award size={11} /> Quiz</span>
                {/if}
              </div>
            </div>
            {#if m.contenu}
              <p class="module-contenu">{m.contenu}</p>
            {/if}
            <div class="module-actions">
              {#if !m.has_quiz}
                <button class="btn-outline-sm" onclick={() => startQuiz(m.id)}>+ Quiz</button>
              {/if}
              <button class="btn-outline-sm" onclick={() => startEditModule(m)}>
                <Pencil size={13} /> Modifier
              </button>
              <button class="btn-danger-sm" onclick={() => handleDeleteModule(m.id)}>
                <Trash2 size={13} /> Supprimer
              </button>
            </div>

            {#if editingModuleId === m.id}
              <form class="edit-module-form" onsubmit={(e) => handleSaveModule(m.id, e)}>
                <div class="form-grid">
                  <div class="field">
                    <label for="edit-module-code-{m.id}">Code</label>
                    <input id="edit-module-code-{m.id}" bind:value={editModule.code} required />
                  </div>
                  <div class="field">
                    <label for="edit-module-titre-{m.id}">Titre (FR)</label>
                    <input id="edit-module-titre-{m.id}" bind:value={editModule.titre} required />
                  </div>
                  <div class="field">
                    <label for="edit-module-duree-{m.id}">Durée (heures)</label>
                    <input id="edit-module-duree-{m.id}" type="number" step="0.5" bind:value={editModule.duree_heures} />
                  </div>
                </div>
                <div class="field">
                  <label for="edit-module-contenu-{m.id}">Contenu (FR)</label>
                  <textarea id="edit-module-contenu-{m.id}" bind:value={editModule.contenu}></textarea>
                </div>
                <div class="form-grid">
                  <div class="field">
                    <label for="edit-module-titre-en-{m.id}">Titre (EN)</label>
                    <input id="edit-module-titre-en-{m.id}" bind:value={editModule.titre_en} />
                  </div>
                </div>
                <div class="field">
                  <label for="edit-module-contenu-en-{m.id}">Contenu (EN)</label>
                  <textarea id="edit-module-contenu-en-{m.id}" bind:value={editModule.contenu_en}></textarea>
                </div>
                <div class="form-actions">
                  <button class="btn-primary-sm" type="submit">Enregistrer</button>
                  <button class="btn-cancel" type="button" onclick={() => (editingModuleId = null)}>Annuler</button>
                </div>
              </form>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">Aucun module pour cette compétence.</div>
    {/if}

    <!-- Quiz Form -->
    {#if quizModuleId !== null}
      <div class="quiz-form-card">
        <h2>Créer un quiz</h2>
        <form onsubmit={handleCreateQuiz}>
          <div class="form-grid">
            <div class="field">
              <label>Titre du quiz</label>
              <input bind:value={quizTitre} required />
            </div>
            <div class="field">
              <label>Seuil de réussite (%)</label>
              <input type="number" bind:value={quizSeuil} />
            </div>
          </div>

          {#each questions as question, qIndex}
            <div class="question-block">
              <h4>Question {qIndex + 1}</h4>
              <div class="field">
                <input placeholder="Texte de la question" bind:value={question.texte} required />
              </div>
              <div class="choices-list">
                {#each question.choix as choice, cIndex}
                  <div class="choice-row">
                    <input placeholder="Choix" bind:value={choice.texte} required style="flex:1" />
                    <label class="radio-label">
                      <input type="radio" name={`correct-${qIndex}`} checked={choice.est_correct} onchange={() => setCorrect(qIndex, cIndex)} />
                      ✓
                    </label>
                    <button class="btn-ghost-sm" type="button" onclick={() => removeChoice(qIndex, cIndex)}>×</button>
                  </div>
                {/each}
              </div>
              <div class="question-actions">
                <button class="btn-add-xs" type="button" onclick={() => addChoice(qIndex)}>+ choix</button>
                <button class="btn-ghost-sm" type="button" onclick={() => removeQuestion(qIndex)}>Supprimer</button>
              </div>
            </div>
          {/each}

          <button class="btn-add-xs" type="button" onclick={addQuestion}>+ question</button>

          <div class="form-actions">
            <button class="btn-primary-sm" type="submit">Enregistrer le quiz</button>
            <button class="btn-cancel" type="button" onclick={() => (quizModuleId = null)}>Annuler</button>
          </div>
        </form>
      </div>
    {/if}
  {/if}
</div>

<style>
  .curriculum-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-desc {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0;
  }

  .selector-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem 1.25rem;
  }

  .selector-card label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #374151;
    display: block;
    margin-bottom: 0.4rem;
  }

  select {
    width: 100%;
    font-family: inherit;
    font-size: 0.88rem;
    padding: 0.6rem 0.75rem;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    background: #f9fafb;
    color: #111827;
  }

  select:focus {
    outline: none;
    border-color: #03a71a;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    border: none;
    border-radius: 8px;
    background: #03a71a;
    color: #fff;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .btn-add:hover { background: #028a15; }

  .form-card, .quiz-form-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
  }

  .quiz-form-card h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
  }

  input, textarea {
    font-family: inherit;
    font-size: 0.88rem;
    padding: 0.55rem 0.75rem;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    background: #f9fafb;
    color: #111827;
    transition: all 0.15s;
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #03a71a;
    box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1);
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .btn-primary-sm {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    background: #03a71a;
    color: #fff;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .modules-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .module-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    transition: all 0.15s;
  }

  .module-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }

  .module-header h3 {
    font-size: 0.9rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .module-badges {
    display: flex;
    gap: 0.4rem;
  }

  .badge-muted {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #f3f4f6;
    color: #6b7280;
  }

  .badge-gold {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #fff3cd;
    color: #8a6800;
  }

  .module-contenu {
    font-size: 0.82rem;
    color: #6b7280;
    margin: 0.3rem 0 0.5rem;
    line-height: 1.5;
  }

  .edit-module-form {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px dashed #d1d5db;
  }

  .module-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .btn-outline-sm {
    padding: 0.35rem 0.7rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: #374151;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .btn-outline-sm:hover {
    border-color: #03a71a;
    color: #047857;
  }

  .btn-danger-sm {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: #fef2f2;
    color: #dc2626;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.78rem;
    cursor: pointer;
    margin-left: auto;
  }

  .btn-danger-sm:hover {
    background: #fee2e2;
  }

  .question-block {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 10px;
    border: 1px solid #f3f4f6;
    margin-top: 0.75rem;
  }

  .question-block h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: #374151;
    margin: 0 0 0.5rem;
  }

  .choices-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .choice-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .radio-label {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.78rem;
    color: #047857;
    cursor: pointer;
  }

  .question-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .btn-add-xs {
    padding: 0.3rem 0.6rem;
    border: 1px dashed #03a71a;
    border-radius: 6px;
    background: #ecfdf5;
    color: #047857;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-ghost-sm {
    padding: 0.3rem 0.5rem;
    border: none;
    border-radius: 6px;
    background: none;
    color: #9ca3af;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .btn-ghost-sm:hover { color: #dc2626; }

  .alert-error {
    padding: 0.7rem 1rem;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid #fecaca;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-size: 0.9rem;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
  }

  @media (max-width: 700px) {
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
