<script lang="ts">
  import Award from "@lucide/svelte/icons/award";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Clock from "@lucide/svelte/icons/clock";
  import { getModuleQuiz } from "$lib/api/curriculum";
  import { enroll, myEnrollments } from "$lib/api/enrollments";
  import { submitQuiz } from "$lib/api/quizzes";
  import type { Enrollment, Quiz, QuizResult } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import { localize } from "$lib/i18n/localize";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let module = $derived(data.module);

  let enrollment = $state<Enrollment | null>(null);
  let quiz = $state<Quiz | null>(null);
  let answers = $state<Record<number, number>>({});
  let result = $state<QuizResult | null>(null);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    const current = module;
    if (auth.role !== "apprenant" || !current) return;
    myEnrollments().then((list) => {
      enrollment = list.find((e) => e.module_id === current.id) ?? null;
    });
    if (current.has_quiz) {
      getModuleQuiz(current.id).then((q) => (quiz = q));
    }
  });

  async function handleEnroll() {
    if (!module) return;
    error = null;
    try {
      enrollment = await enroll(module.id);
      message = "Inscription confirmee.";
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function handleSubmitQuiz(event: SubmitEvent) {
    event.preventDefault();
    if (!quiz) return;
    error = null;
    try {
      const payload = Object.entries(answers).map(([questionId, choiceId]) => ({
        question_id: Number(questionId),
        choice_id: choiceId,
      }));
      result = await submitQuiz(quiz.id, payload);
      if (result.reussi && enrollment) {
        enrollment = { ...enrollment, statut: "termine" };
      }
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<svelte:head>
  <title>{module ? `${localize(module.titre, module.titre_en)} — Trankyl Academy` : "Trankyl Academy"}</title>
</svelte:head>

{#if data.apiError}
  <p class="alert alert-error">{data.apiError}</p>
{:else if module}
  <div class="section">
    <h1>{localize(module.titre, module.titre_en)}</h1>
    <div class="row" style="margin-bottom:1rem">
      <span class="badge badge-muted"><Clock size={11} />{module.duree_heures}h</span>
      {#if module.has_quiz}<span class="badge badge-gold"><Award size={11} />Avec quiz</span>{/if}
    </div>
    {#if module.contenu}<p>{localize(module.contenu, module.contenu_en)}</p>{/if}
  </div>

  <div class="card">
    {#if auth.role !== "apprenant"}
      <p><a href="/login">Connectez-vous</a> pour vous inscrire a ce module.</p>
    {:else if !enrollment}
      <button class="btn btn-primary" onclick={handleEnroll}>S'inscrire a ce module</button>
    {:else if enrollment.statut === "termine"}
      <p class="badge badge-green"><CircleCheck size={12} />Module termine</p>
    {:else if quiz}
      <h2>{quiz.titre}</h2>
      <form onsubmit={handleSubmitQuiz}>
        {#each quiz.questions as question}
          <fieldset>
            <legend>{question.texte}</legend>
            <div class="stack">
              {#each question.choix as choice}
                <label class="row">
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={choice.id}
                    onchange={() => (answers[question.id] = choice.id)}
                  />
                  {choice.texte}
                </label>
              {/each}
            </div>
          </fieldset>
        {/each}
        <button class="btn btn-primary" type="submit">Valider le quiz</button>
      </form>
      {#if result}
        <p class="alert" class:alert-success={result.reussi} class:alert-error={!result.reussi}>
          Score : {result.score_pct}% — {result.reussi ? "Reussi !" : "Insuffisant, reessayez."}
        </p>
      {/if}
    {:else}
      <p class="loading">Chargement du quiz...</p>
    {/if}

    {#if message}<p class="badge badge-green">{message}</p>{/if}
    {#if error}<p class="alert alert-error">{error}</p>{/if}
  </div>
{/if}
