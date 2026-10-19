<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Calendar from "@lucide/svelte/icons/calendar";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Layers from "@lucide/svelte/icons/layers";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { enrollNiveau, myNiveauEnrollments } from "$lib/api/enrollments";
  import type { MetierDetail, NiveauEnrollment } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import { localize } from "$lib/i18n/localize";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let niveauEnrollments = $state<NiveauEnrollment[]>([]);
  let enrollingId = $state<number | null>(null);

  onMount(() => {
    if (auth.role === "apprenant") {
      myNiveauEnrollments().then((list) => (niveauEnrollments = list));
    }
  });

  function isEnrolled(niveauId: number) {
    return niveauEnrollments.some((e) => e.niveau_id === niveauId);
  }

  function moduleCount(niveau: MetierDetail["niveaux"][number]) {
    return niveau.competences.reduce((sum, c) => sum + (c.modules?.length ?? 0), 0);
  }

  const dateLocale = { fr: "fr-FR", en: "en-US" } as const;

  function formatDate(iso: string | null) {
    if (!iso) return i18n.dict.metierDetail.dateTbd;
    return new Date(iso).toLocaleDateString(dateLocale[i18n.locale], { day: "numeric", month: "long", year: "numeric" });
  }

  async function handleCardClick(niveau: MetierDetail["niveaux"][number]) {
    if (isEnrolled(niveau.id)) {
      goto("/apprenant");
      return;
    }
    if (auth.role !== "apprenant") {
      goto("/register");
      return;
    }
    enrollingId = niveau.id;
    try {
      const enrollment = await enrollNiveau(niveau.id);
      niveauEnrollments = [...niveauEnrollments, enrollment];
      snackbar.success(i18n.dict.metierDetail.inscriptionConfirmee(niveau.numero, niveau.nom));
      goto("/apprenant");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      enrollingId = null;
    }
  }
</script>

<Seo
  title={data.metier ? `${localize(data.metier.nom, data.metier.nom_en)} — Trankyl Academy` : "Métier — Trankyl Academy"}
  description={data.metier
    ? (localize(data.metier.description ?? "", data.metier.description_en) ||
        `Formation et certification au métier de ${data.metier.nom} par Trankyl Academy.`)
    : "Formation et certification aux métiers du service à domicile par Trankyl Academy."}
/>

{#if data.apiError}
  <p class="alert alert-error">{data.apiError}</p>
{:else if data.metier}
  <div class="section">
    <a class="row" href="/" style="gap:.35rem; font-size:.9rem; margin-bottom:1rem;">
      <ArrowLeft size={15} />
      {i18n.dict.metierDetail.tousLesMetiers}
    </a>
    <span class="eyebrow">{i18n.dict.metierDetail.eyebrow}</span>
    <h1>{localize(data.metier.nom, data.metier.nom_en)}</h1>
    {#if data.metier.description}<p>{localize(data.metier.description, data.metier.description_en)}</p>{/if}
  </div>

  {#if data.metier.niveaux.length === 0}
    <div class="empty-state"><p>{i18n.dict.metierDetail.noNiveaux}</p></div>
  {:else}
    <div class="section-head left">
      <h2>{i18n.dict.metierDetail.niveauxDisponibles}</h2>
    </div>

    <div class="grid-cards">
      {#each data.metier.niveaux as niveau}
        {@const enrolled = isEnrolled(niveau.id)}
        <button
          class="niveau-card"
          class:enrolled
          onclick={() => handleCardClick(niveau)}
          disabled={enrollingId === niveau.id}
        >
          <div class="niveau-card-head">
            <h3>Niveau {niveau.numero} — {localize(niveau.nom, niveau.nom_en)}</h3>
            {#if enrolled}<span class="badge badge-green"><CircleCheck size={11} />{i18n.dict.metierDetail.inscrit}</span>{/if}
          </div>

          {#if niveau.description}<p class="muted">{localize(niveau.description, niveau.description_en)}</p>{/if}

          <div class="row niveau-card-meta">
            <span class="badge badge-gold"><Calendar size={11} />{formatDate(niveau.date_debut)}</span>
            <span class="badge badge-muted"><Layers size={11} />{i18n.dict.metierDetail.modules(moduleCount(niveau))}</span>
          </div>

          {#if niveau.competences.length > 0}
            <ul class="niveau-card-comps">
              {#each niveau.competences as comp}
                <li>{localize(comp.titre, comp.titre_en)}</li>
              {/each}
            </ul>
          {/if}

          <span class="niveau-card-cta">
            {#if enrolled}
              {i18n.dict.metierDetail.voirMonEspace}
            {:else if enrollingId === niveau.id}
              {i18n.dict.metierDetail.inscriptionEnCours}
            {:else}
              {i18n.dict.metierDetail.sinscrire}
            {/if}
            <ArrowRight size={14} />
          </span>
        </button>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .niveau-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    text-align: left;
    background: var(--surface);
    border: none;
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    padding: 1.5rem;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .niveau-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow);
  }

  .niveau-card:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .niveau-card.enrolled {
    box-shadow: 0 0 0 2px var(--green) inset;
  }

  .niveau-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .niveau-card-head h3 {
    margin: 0;
  }

  .niveau-card-meta {
    margin: 0.2rem 0;
  }

  .niveau-card-comps {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
    margin: 0.2rem 0 0;
  }

  .niveau-card-comps li::before {
    content: "• ";
    color: var(--green);
  }

  .niveau-card-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: auto;
    padding-top: 0.75rem;
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--green-dark);
  }
</style>
