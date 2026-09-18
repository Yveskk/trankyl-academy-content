<script lang="ts">
  import { onMount } from "svelte";
  import Users from "@lucide/svelte/icons/users";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Award from "@lucide/svelte/icons/award";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Gauge from "@lucide/svelte/icons/gauge";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import CalendarCheck from "@lucide/svelte/icons/calendar-check";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { localize } from "$lib/i18n/localize";
  import { getPublicImpactStats } from "$lib/api/stats";
  import type { PublicImpactStats } from "$lib/api/types";

  let stats = $state<PublicImpactStats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(() => {
    getPublicImpactStats()
      .then((data) => (stats = data))
      .catch((e) => (error = (e as Error).message))
      .finally(() => (loading = false));
  });

  let maxMetierCount = $derived(
    stats && stats.repartition_par_metier.length > 0
      ? Math.max(...stats.repartition_par_metier.map((m) => m.certified_count))
      : 1
  );

  let maxGenreCount = $derived(
    stats && stats.repartition_genre.length > 0 ? Math.max(...stats.repartition_genre.map((g) => g.count)) : 1
  );

  function genreLabel(genre: string): string {
    if (genre === "F") return i18n.locale === "en" ? "Women" : "Femmes";
    if (genre === "M") return i18n.locale === "en" ? "Men" : "Hommes";
    return genre;
  }

  function formatNumber(n: number): string {
    return n.toLocaleString(i18n.locale === "en" ? "en-US" : "fr-FR");
  }
</script>

<Seo title={i18n.dict.impact.title} description={i18n.dict.impact.subtitle} />

<div class="impact-page">
  <div class="impact-hero">
    <div class="impact-hero-inner">
      <span class="eyebrow">{i18n.dict.impact.heroKicker}</span>
      <h1>{i18n.dict.impact.title}</h1>
      <p>{i18n.dict.impact.subtitle}</p>
    </div>
  </div>

  {#if loading}
    <p class="muted impact-loading">{i18n.dict.impact.loading}</p>
  {:else if error}
    <p class="alert alert-error impact-loading">{error}</p>
  {:else if stats}
    <!-- HERO KPI STRIP -->
    <div class="impact-kpi-band">
      <div class="impact-kpi-inner">
        <div class="impact-kpi">
          <span class="impact-kpi-value">{formatNumber(stats.total_apprenants)}</span>
          <span class="impact-kpi-label">{i18n.dict.impact.statTotalApprenants}</span>
        </div>
        <div class="impact-kpi-sep" aria-hidden="true"></div>
        <div class="impact-kpi">
          <span class="impact-kpi-value">{formatNumber(stats.total_reservations)}</span>
          <span class="impact-kpi-label">{i18n.dict.impact.statTotalReservations}</span>
        </div>
        <div class="impact-kpi-sep" aria-hidden="true"></div>
        <div class="impact-kpi">
          <span class="impact-kpi-value">{formatNumber(stats.total_certifications)}</span>
          <span class="impact-kpi-label">{i18n.dict.impact.statTotalCertifications}</span>
        </div>
      </div>
    </div>

    <div class="impact-body">
      <!-- FORMATION -->
      <section class="impact-section">
        <div class="impact-section-head">
          <span class="eyebrow">{i18n.dict.impact.formationTitle}</span>
        </div>
        <div class="impact-cards">
          <div class="impact-card">
            <span class="impact-card-icon"><Users size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.total_apprenants)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statTotalApprenants}</span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon"><BookOpen size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.total_modules_completed)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statModulesCompleted}</span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon gold"><Award size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.total_certifications)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statTotalCertifications}</span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon"><TrendingUp size={20} /></span>
            <span class="impact-card-value">{stats.taux_completion_moyen_pct !== null ? `${stats.taux_completion_moyen_pct}%` : "—"}</span>
            <span class="impact-card-label">
              {stats.taux_completion_moyen_pct !== null ? i18n.dict.impact.statCompletionRate : i18n.dict.impact.completionRateNoData}
            </span>
          </div>
        </div>

        {#if stats.repartition_par_metier.length > 0}
          <h3 class="impact-subheading">{i18n.dict.impact.repartitionMetierTitle}</h3>
          <div class="impact-bars">
            {#each stats.repartition_par_metier as m (m.metier_code)}
              <div class="bar-row">
                <span class="bar-label">{localize(m.metier_nom, m.metier_nom_en)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:{(m.certified_count / maxMetierCount) * 100}%"></div></div>
                <span class="bar-value">{m.certified_count}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if stats.certifications_par_niveau.length > 0}
          <h3 class="impact-subheading">{i18n.dict.impact.certificationsByNiveauTitle}</h3>
          <div class="cert-niveau-grid">
            {#each stats.certifications_par_niveau as n (`${n.metier_code}-${n.niveau_numero}`)}
              <div class="cert-niveau-card">
                <span class="badge badge-green">{i18n.dict.impact.niveauLabel(n.niveau_numero)}</span>
                <div class="cert-niveau-metier">{n.metier_nom}</div>
                <div class="cert-niveau-count">{n.certifications_count}</div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- CONFIANCE & SECURITE -->
      <section class="impact-section impact-section-trust">
        <div class="impact-section-head">
          <span class="eyebrow gold">{i18n.dict.impact.trustTitle}</span>
          <p>{i18n.dict.impact.trustIntro}</p>
        </div>
        <div class="impact-cards">
          <div class="impact-card">
            <span class="impact-card-icon"><ShieldCheck size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.profils_verifies)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statProfilsVerifies}</span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon gold"><Gauge size={20} /></span>
            <span class="impact-card-value">{stats.score_confiance_moyen !== null ? `${stats.score_confiance_moyen}/100` : "—"}</span>
            <span class="impact-card-label">
              {stats.score_confiance_moyen !== null ? i18n.dict.impact.statScoreConfiance : i18n.dict.impact.scoreNoData}
            </span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon warn"><ShieldAlert size={20} /></span>
            <span class="impact-card-value">{stats.pct_profils_bloques_verification !== null ? `${stats.pct_profils_bloques_verification}%` : "—"}</span>
            <span class="impact-card-label">{i18n.dict.impact.statPctBloques}</span>
          </div>
        </div>
      </section>

      <!-- PORTEE -->
      <section class="impact-section">
        <div class="impact-section-head">
          <span class="eyebrow">{i18n.dict.impact.reachTitle}</span>
        </div>
        <div class="impact-cards impact-cards-reach">
          <div class="impact-card">
            <span class="impact-card-icon"><MapPin size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.nombre_villes)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statVilles}</span>
          </div>
          <div class="impact-card">
            <span class="impact-card-icon"><CalendarCheck size={20} /></span>
            <span class="impact-card-value">{formatNumber(stats.total_reservations)}</span>
            <span class="impact-card-label">{i18n.dict.impact.statTotalReservations}</span>
          </div>
        </div>

        {#if stats.repartition_genre.length > 0}
          <h3 class="impact-subheading">{i18n.dict.impact.statGenre}</h3>
          <div class="impact-bars">
            {#each stats.repartition_genre as g (g.genre)}
              <div class="bar-row">
                <span class="bar-label">{genreLabel(g.genre)}</span>
                <div class="bar-track"><div class="bar-fill gold" style="width:{(g.count / maxGenreCount) * 100}%"></div></div>
                <span class="bar-value">{g.count}</span>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .impact-page {
    padding-top: 0;
  }

  .impact-loading {
    text-align: center;
    padding: 4rem 0;
  }

  /* --- hero --- */
  .impact-hero {
    background: linear-gradient(150deg, var(--green-deep) 0%, var(--green-dark) 55%, #04220b 100%);
    margin: -2.5rem -1.5rem 0;
    padding: 4.5rem 1.5rem 3rem;
  }

  .impact-hero-inner {
    max-width: var(--content-width);
    margin: 0 auto;
    text-align: center;
  }

  .impact-hero-inner .eyebrow {
    background: rgba(255, 255, 255, 0.12);
    color: var(--gold, #fec600);
  }

  .impact-hero-inner h1 {
    color: #fff;
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    margin: 0.75rem 0 0.9rem;
  }

  .impact-hero-inner p {
    color: rgba(255, 255, 255, 0.82);
    max-width: 640px;
    margin: 0 auto;
    font-size: 1.02rem;
    line-height: 1.7;
  }

  /* --- KPI band --- */
  .impact-kpi-band {
    background: linear-gradient(150deg, var(--green-dark) 0%, #04220b 100%);
    padding: 0 1.5rem 3rem;
    margin: 0 -1.5rem;
  }

  .impact-kpi-inner {
    max-width: var(--content-width);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.5rem;
    flex-wrap: wrap;
  }

  .impact-kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    text-align: center;
    max-width: 220px;
  }

  .impact-kpi-value {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 4.5vw, 3.2rem);
    font-weight: 800;
    color: var(--gold, #fec600);
    line-height: 1;
  }

  .impact-kpi-label {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .impact-kpi-sep {
    width: 1px;
    height: 48px;
    background: rgba(255, 255, 255, 0.18);
  }

  @media (max-width: 700px) {
    .impact-kpi-sep {
      display: none;
    }
    .impact-kpi-inner {
      gap: 2rem;
    }
  }

  /* --- body sections --- */
  .impact-body {
    max-width: var(--content-width);
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .impact-section {
    padding: 3.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .impact-section:last-child {
    border-bottom: none;
  }

  .impact-section-head {
    text-align: center;
    max-width: 640px;
    margin: 0 auto 2rem;
  }

  .impact-section-head .eyebrow.gold {
    background: var(--gold-soft);
    color: var(--gold-ink);
  }

  .impact-section-head p {
    margin-top: 0.6rem;
    color: var(--ink-soft);
    line-height: 1.6;
  }

  .impact-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.25rem;
  }

  .impact-cards-reach {
    max-width: 560px;
    margin: 0 auto;
  }

  .impact-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.75rem 1.25rem;
    box-shadow: var(--shadow-sm);
    transition: transform 0.18s, box-shadow 0.18s;
  }

  .impact-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow);
  }

  .impact-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--green-soft);
    color: var(--green-dark);
  }

  .impact-card-icon.gold {
    background: var(--gold-soft);
    color: var(--gold-ink);
  }

  .impact-card-icon.warn {
    background: #fee2e2;
    color: #b91c1c;
  }

  .impact-card-value {
    font-size: 1.9rem;
    font-weight: 800;
    color: var(--ink);
    line-height: 1.1;
  }

  .impact-card-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
    line-height: 1.4;
  }

  .impact-section-trust {
    background: var(--surface);
    margin: 0 -1.5rem;
    padding: 3.5rem 1.5rem;
    border-radius: var(--radius);
  }

  .impact-section-trust .impact-cards {
    max-width: 720px;
    margin: 0 auto;
  }

  .impact-subheading {
    margin: 2.5rem 0 1.1rem;
    font-size: 1.05rem;
    text-align: center;
  }

  /* --- niveau cards --- */
  .cert-niveau-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 0.9rem;
  }

  .cert-niveau-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1rem;
  }

  .cert-niveau-metier {
    margin-top: 0.55rem;
    font-weight: 700;
    font-size: 0.86rem;
    color: var(--ink);
  }

  .cert-niveau-count {
    margin-top: 0.15rem;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--green-dark);
  }

  /* --- bars --- */
  .impact-bars {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    max-width: 640px;
    margin: 0 auto;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 190px 1fr 44px;
    align-items: center;
    gap: 0.85rem;
  }

  .bar-label {
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--ink);
  }

  .bar-track {
    height: 11px;
    border-radius: 999px;
    background: #eef1ec;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--green), var(--green-dark));
    transition: width 0.4s ease-out;
  }

  .bar-fill.gold {
    background: linear-gradient(90deg, #ffd84d, var(--gold, #fec600));
  }

  .bar-value {
    text-align: right;
    font-weight: 800;
    font-size: 0.85rem;
    color: var(--ink);
  }

  @media (max-width: 600px) {
    .impact-hero {
      padding: 3rem 1.25rem 2.25rem;
    }
    .bar-row {
      grid-template-columns: 100px 1fr 34px;
      gap: 0.5rem;
    }
    .impact-section-trust {
      margin: 0 -1.25rem;
      padding: 3rem 1.25rem;
    }
  }
</style>
