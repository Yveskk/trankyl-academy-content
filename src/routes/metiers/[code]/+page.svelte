<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Award from "@lucide/svelte/icons/award";
  import Clock from "@lucide/svelte/icons/clock";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.metier?.nom ?? "Metier"} — Trankyl Academy</title>
</svelte:head>

{#if data.apiError}
  <p class="alert alert-error">{data.apiError}</p>
{:else if data.metier}
  <div class="section">
    <a class="row" href="/" style="gap:.35rem; font-size:.9rem; margin-bottom:1rem;">
      <ArrowLeft size={15} />
      Tous les metiers
    </a>
    <span class="eyebrow">Parcours de formation</span>
    <h1>{data.metier.nom}</h1>
    {#if data.metier.description}<p>{data.metier.description}</p>{/if}
  </div>

  {#each data.metier.niveaux as niveau}
    <section class="section">
      <div class="row" style="justify-content: space-between; margin-bottom: .5rem;">
        <h2 style="margin-bottom:0">Niveau {niveau.numero} — {niveau.nom}</h2>
        <span class="badge badge-green">{niveau.competences.length} competence(s)</span>
      </div>
      {#if niveau.description}<p>{niveau.description}</p>{/if}

      <div class="stack">
        {#each niveau.competences as competence}
          <div class="card">
            <h3>{competence.titre}</h3>
            {#if competence.description}<p class="muted">{competence.description}</p>{/if}

            {#if (data.modulesByCompetence.get(competence.id) ?? []).length > 0}
              <ul class="stack">
                {#each data.modulesByCompetence.get(competence.id) ?? [] as module}
                  <li class="row">
                    <a href="/modules/{module.id}">{module.titre}</a>
                    <span class="badge badge-muted"><Clock size={11} />{module.duree_heures}h</span>
                    {#if module.has_quiz}<span class="badge badge-gold"><Award size={11} />Quiz</span>{/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="muted">Aucun module publie pour cette competence.</p>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}
{/if}
