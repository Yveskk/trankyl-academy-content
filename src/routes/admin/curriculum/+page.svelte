<script lang="ts">
  import { createModule, createQuiz, deleteModule, listModules } from "$lib/api/curriculum";
  import { getMetier, listMetiers } from "$lib/api/taxonomy";
  import type { ModuleItem } from "$lib/api/types";

  interface CompetenceOption {
    id: number;
    label: string;
  }

  let allCompetences = $state<CompetenceOption[]>([]);
  let selectedCompetenceId = $state<number | null>(null);
  let modules = $state<ModuleItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let newModule = $state({ code: "", titre: "", contenu: "", duree_heures: 2 });

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
    if (selectedCompetenceId === null) {
      modules = [];
      return;
    }
    modules = await listModules(selectedCompetenceId);
  }

  $effect(() => {
    loadCompetences();
  });

  $effect(() => {
    loadModules();
  });

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
        duree_heures: newModule.duree_heures,
      });
      newModule = { code: "", titre: "", contenu: "", duree_heures: 2 };
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

  function startQuiz(moduleId: number) {
    quizModuleId = moduleId;
    quizTitre = "";
    quizSeuil = 70;
    questions = [
      {
        texte: "",
        choix: [
          { texte: "", est_correct: true },
          { texte: "", est_correct: false },
        ],
      },
    ];
  }

  function addQuestion() {
    questions.push({
      texte: "",
      choix: [
        { texte: "", est_correct: true },
        { texte: "", est_correct: false },
      ],
    });
  }

  function removeQuestion(index: number) {
    questions.splice(index, 1);
  }

  function addChoice(qIndex: number) {
    questions[qIndex].choix.push({ texte: "", est_correct: false });
  }

  function removeChoice(qIndex: number, cIndex: number) {
    questions[qIndex].choix.splice(cIndex, 1);
  }

  function setCorrect(qIndex: number, cIndex: number) {
    questions[qIndex].choix.forEach((c, i) => (c.est_correct = i === cIndex));
  }

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
          texte: q.texte,
          ordre: i,
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

<h1>Curriculum</h1>
<p class="muted">Modules de formation et quiz de fin de module.</p>

{#if error}<p class="alert alert-error">{error}</p>{/if}

{#if loading}
  <p class="loading">Chargement...</p>
{:else}
  <div class="card section">
    <div class="field">
      <label for="competence">Competence</label>
      <select id="competence" bind:value={selectedCompetenceId}>
        <option value={null}>-- choisir --</option>
        {#each allCompetences as c}
          <option value={c.id}>{c.label}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if selectedCompetenceId !== null}
    <div class="card section">
      <form onsubmit={handleAddModule}>
        <h2>Nouveau module</h2>
        <div class="field">
          <label for="module-code">Code</label>
          <input id="module-code" placeholder="ex: nounou_hygiene_base_m1" bind:value={newModule.code} required />
        </div>
        <div class="field">
          <label for="module-titre">Titre</label>
          <input id="module-titre" bind:value={newModule.titre} required />
        </div>
        <div class="field">
          <label for="module-contenu">Contenu</label>
          <textarea id="module-contenu" bind:value={newModule.contenu}></textarea>
        </div>
        <div class="field">
          <label for="module-duree">Duree (heures)</label>
          <input id="module-duree" type="number" step="0.5" bind:value={newModule.duree_heures} />
        </div>
        <button class="btn btn-primary" type="submit">Ajouter le module</button>
      </form>
    </div>

    {#if modules.length > 0}
      <ul class="stack section">
        {#each modules as m}
          <li class="card row">
            <span>{m.titre}</span>
            <span class="badge badge-muted">{m.duree_heures}h</span>
            {#if m.has_quiz}<span class="badge badge-gold">quiz OK</span>{/if}
            <span style="flex:1"></span>
            {#if !m.has_quiz}
              <button class="btn btn-outline btn-sm" onclick={() => startQuiz(m.id)}>+ Quiz</button>
            {/if}
            <button class="btn btn-danger btn-sm" onclick={() => handleDeleteModule(m.id)}>Supprimer</button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="muted">Aucun module pour cette competence.</p>
    {/if}
  {/if}

  {#if quizModuleId !== null}
    <div class="card section">
      <form onsubmit={handleCreateQuiz}>
        <h2>Nouveau quiz</h2>
        <div class="field">
          <label for="quiz-titre">Titre du quiz</label>
          <input id="quiz-titre" bind:value={quizTitre} required />
        </div>
        <div class="field">
          <label for="quiz-seuil">Seuil de reussite (%)</label>
          <input id="quiz-seuil" type="number" bind:value={quizSeuil} />
        </div>

        {#each questions as question, qIndex}
          <fieldset>
            <legend>Question {qIndex + 1}</legend>
            <div class="field">
              <input placeholder="texte de la question" bind:value={question.texte} required />
            </div>
            <div class="stack">
              {#each question.choix as choice, cIndex}
                <div class="row">
                  <input placeholder="choix" bind:value={choice.texte} required style="flex:1" />
                  <label class="row">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={choice.est_correct}
                      onchange={() => setCorrect(qIndex, cIndex)}
                    />
                    correct
                  </label>
                  <button class="btn btn-ghost btn-sm" type="button" onclick={() => removeChoice(qIndex, cIndex)}
                    >x</button
                  >
                </div>
              {/each}
            </div>
            <div class="row" style="margin-top:.6rem">
              <button class="btn btn-outline btn-sm" type="button" onclick={() => addChoice(qIndex)}>+ choix</button>
              <button class="btn btn-ghost btn-sm" type="button" onclick={() => removeQuestion(qIndex)}
                >Supprimer la question</button
              >
            </div>
          </fieldset>
        {/each}

        <div class="row">
          <button class="btn btn-outline btn-sm" type="button" onclick={addQuestion}>+ question</button>
        </div>
        <div class="row">
          <button class="btn btn-primary" type="submit">Enregistrer le quiz</button>
          <button class="btn btn-ghost" type="button" onclick={() => (quizModuleId = null)}>Annuler</button>
        </div>
      </form>
    </div>
  {/if}
{/if}
