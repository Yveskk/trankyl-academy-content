<script lang="ts">
  import { onMount } from "svelte";
  import { searchPrestataires } from "$lib/api/matching";
  import { listMetiers } from "$lib/api/taxonomy";
  import type { Metier, Prestataire } from "$lib/api/types";
  import { localize } from "$lib/i18n/localize";
  import Seo from "$lib/components/Seo.svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Award from "@lucide/svelte/icons/award";
  import Gauge from "@lucide/svelte/icons/gauge";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  let metiers = $state<Metier[]>([]);
  let selectedMetier = $state<string>("");
  let prestataires = $state<Prestataire[]>([]);
  let loading = $state(true);
  let expandedId = $state<number | null>(null);

  onMount(async () => {
    try {
      metiers = await listMetiers();
    } catch {
      metiers = [];
    }
    // Par defaut on affiche une seule categorie (pas tous les prestataires
    // certifies d'un coup) — la personne choisit ensuite via le filtre.
    if (metiers.length > 0) {
      selectedMetier = metiers[0].code;
    }
    await refresh();
  });

  async function refresh() {
    loading = true;
    try {
      prestataires = await searchPrestataires(selectedMetier || undefined);
    } catch {
      prestataires = [];
    } finally {
      loading = false;
    }
  }

  function scoreColor(score: number | null): string {
    if (score === null) return "#9ca3af";
    if (score >= 70) return "#047857";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  }

  let metierByCode = $derived(new Map(metiers.map((m) => [m.code, m])));

  function metierCodeFromCert(cert: string): string {
    return cert.split("_niveau_")[0] ?? cert;
  }

  // Un client qui parcourt les résultats n'a pas besoin de savoir à quel
  // niveau précis correspond chaque certification — seulement dans quels
  // métiers le prestataire est certifié, et combien de certifications il a
  // en tout (regroupées par métier pour éviter les doublons niveau 1/2/3).
  function metierChips(p: Prestataire): { code: string; label: string }[] {
    const codes = [...new Set(p.certifications.map(metierCodeFromCert))];
    return codes.map((code) => {
      const m = metierByCode.get(code);
      return { code, label: m ? localize(m.nom, m.nom_en) : code };
    });
  }
</script>

<Seo
  title="Prestataires certifiés"
  description="Trouvez un prestataire certifié Trankyl Academy près de chez vous : nounous, aides à domicile, cuisiniers, agents d'entretien formés et évalués."
/>

<div class="public-page liste-page">
  <a class="back-link" href="/prestataires"><ArrowLeft size={15} /> Retour au chat SITA</a>

  <div class="filter-row">
    <label for="metier-filter">Métier recherché</label>
    <select id="metier-filter" bind:value={selectedMetier} onchange={refresh}>
      <option value="">Tous les métiers</option>
      {#each metiers as m}
        <option value={m.code}>{localize(m.nom, m.nom_en)}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <div class="empty-state"><p>Chargement...</p></div>
  {:else if prestataires.length === 0}
    <div class="empty-state"><p>Aucun prestataire vérifié et certifié ne correspond pour le moment.</p></div>
  {:else}
    <div class="prestataires-grid">
      {#each prestataires as p}
        <div class="prestataire-card">
          <a class="prestataire-main" href="/prestataires/{p.id}">
            <div class="avatar">{p.firstname[0]}{p.lastname[0]}</div>
            <div class="info">
              <span class="name">{p.firstname} {p.lastname}</span>
              <span class="view-profile">Voir le profil <ArrowRight size={12} /></span>
            </div>
          </a>

          <div class="certs">
            {#each metierChips(p) as chip (chip.code)}
              <span class="cert-chip"><Award size={11} />{chip.label}</span>
            {/each}
            <span class="cert-count">{p.certifications.length} certification{p.certifications.length > 1 ? "s" : ""}</span>
          </div>

          <div class="scores">
            {#if p.match_score !== null}
              <button class="score-badge main-score" style="color:{scoreColor(p.match_score)}" onclick={() => (expandedId = expandedId === p.id ? null : p.id)}>
                <Gauge size={14} />
                {p.match_score}/100
                <ChevronDown size={13} class={expandedId === p.id ? "rotated" : ""} />
              </button>
            {/if}
            {#if p.trust_score !== null}
              <span class="score-badge" style="color:{scoreColor(p.trust_score)}">Confiance {p.trust_score}/100</span>
            {/if}
          </div>

          {#if expandedId === p.id && p.match_breakdown}
            <div class="breakdown">
              {#each Object.values(p.match_breakdown) as item}
                <div class="breakdown-row">
                  <div class="breakdown-row-top">
                    <span class="breakdown-label">{item.label} <em>(poids {Math.round(item.weight * 100)}%)</em></span>
                    <span class="breakdown-value">{item.value_pct}%</span>
                  </div>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar" style="width:{item.value_pct}%; background:{scoreColor(item.value_pct)}"></div>
                  </div>
                  <span class="breakdown-detail">{item.detail}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .liste-page { padding-bottom: 3rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.5rem; color: var(--green-dark); font-size: 0.88rem; font-weight: 600; text-decoration: none; }
  .back-link:hover { text-decoration: underline; }

  .filter-row { display: flex; align-items: center; gap: 0.75rem; margin: 1.5rem 0; }
  .filter-row label { font-size: 0.85rem; font-weight: 700; color: var(--ink); }
  .filter-row select { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.8rem; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; }

  .empty-state { text-align: center; padding: 3rem; color: var(--muted); }

  .prestataires-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.1rem; }
  .prestataire-card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  }
  .prestataire-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); border-color: #d1e7d5; }
  .prestataire-main { display: flex; align-items: center; gap: 0.85rem; text-decoration: none; color: inherit; }
  .prestataire-main:hover { text-decoration: none; }
  .avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
  .info { flex: 1; min-width: 0; }
  .name { display: block; font-weight: 800; color: #111827; font-size: 1.02rem; }
  .view-profile { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.76rem; font-weight: 700; color: var(--green-dark); margin-top: 0.15rem; }
  .certs { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.85rem; }
  .cert-chip { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px; background: #fff3cd; color: #8a6800; }
  .cert-count { display: inline-flex; align-items: center; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px; background: #f3f4f6; color: #6b7280; }

  .scores { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.9rem; padding-top: 0.9rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; }
  .score-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 700; padding: 0.3rem 0.6rem; border-radius: 999px; background: #f3f4f6; border: none; cursor: default; }
  .score-badge.main-score { cursor: pointer; background: #f9fafb; border: 1px solid #e5e7eb; }
  :global(.rotated) { transform: rotate(180deg); }

  .breakdown { margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 0.6rem; }
  .breakdown-row { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; }
  .breakdown-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
  .breakdown-label { color: #374151; font-weight: 600; }
  .breakdown-label em { color: #9ca3af; font-style: normal; font-weight: 400; }
  .breakdown-bar-wrap { height: 6px; border-radius: 999px; background: #f3f4f6; overflow: hidden; }
  .breakdown-bar { height: 100%; border-radius: 999px; }
  .breakdown-value { font-weight: 700; color: #111827; flex-shrink: 0; }
  .breakdown-detail { color: #9ca3af; font-size: 0.72rem; }
</style>
