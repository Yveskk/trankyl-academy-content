<script lang="ts">
  import { page } from "$app/stores";
  import { searchPrestataires } from "$lib/api/matching";
  import { getMetier } from "$lib/api/taxonomy";
  import type { Prestataire, MetierDetail } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import Award from "@lucide/svelte/icons/award";
  import Send from "@lucide/svelte/icons/send";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";

  let prestataire = $state<Prestataire | null>(null);
  let metiers = $state<MetierDetail[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const id = Number($page.params.id);
    loadData(id);
  });

  async function loadData(id: number) {
    loading = true;
    try {
      const all = await searchPrestataires();
      prestataire = all.find((p) => p.id === id) ?? null;
      if (prestataire) {
        // Charger les métiers correspondant aux certifications
        const metierCodes = new Set<string>();
        for (const cert of prestataire.certifications) {
          const parts = cert.split("_niveau_");
          if (parts[0]) metierCodes.add(parts[0].replace(/_/g, "-"));
        }
        const loaded: MetierDetail[] = [];
        for (const code of metierCodes) {
          try {
            const m = await getMetier(code);
            loaded.push(m);
          } catch { /* skip */ }
        }
        metiers = loaded;
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  function certLabel(cert: string): string {
    // nounou_niveau_1 -> Nounou — Niveau 1
    const parts = cert.split("_niveau_");
    const metierName = parts[0]?.replace(/_/g, " ") ?? cert;
    const niveau = parts[1] ?? "?";
    return `${metierName.charAt(0).toUpperCase() + metierName.slice(1)} — Niveau ${niveau}`;
  }
</script>

<div class="profile-page">
  {#if loading}
    <div class="loading-state">Chargement du profil...</div>
  {:else if error}
    <div class="alert-error">{error}</div>
  {:else if !prestataire}
    <div class="empty-state">
      <h2>Prestataire introuvable</h2>
      <a href="/prestataires" class="back-link"><ArrowLeft size={15} /> Retour à la recherche</a>
    </div>
  {:else}
    <!-- Back -->
    <a class="back-link" href="/prestataires"><ArrowLeft size={15} /> Tous les prestataires</a>

    <!-- Profile Header -->
    <div class="profile-header">
      <div class="profile-avatar">
        {prestataire.firstname[0]}{prestataire.lastname[0]}
      </div>
      <div class="profile-main">
        <h1>{prestataire.firstname} {prestataire.lastname}</h1>
        <p class="profile-subtitle">Prestataire Trankyl Academy</p>
      </div>
      <div class="profile-actions">
        {#if auth.role === "apprenant"}
          <a href="/messagerie?user={prestataire.id}" class="btn-contact">
            <Send size={16} /> Contacter
          </a>
        {:else}
          <a href="/login" class="btn-contact-outline">Se connecter pour contacter</a>
        {/if}
      </div>
    </div>

    <!-- Certifications -->
    <div class="section-card">
      <h2><Award size={18} /> Certifications obtenues</h2>
      {#if prestataire.certifications.length > 0}
        <div class="cert-grid">
          {#each prestataire.certifications as cert}
            <div class="cert-card">
              <Award size={20} class="cert-icon" />
              <div>
                <span class="cert-name">{certLabel(cert)}</span>
                <span class="cert-code">{cert}</span>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="muted">Aucune certification obtenue pour le moment.</p>
      {/if}
    </div>

    <!-- Compétences par métier -->
    {#if metiers.length > 0}
      <div class="section-card">
        <h2><GraduationCap size={18} /> Compétences</h2>
        {#each metiers as metier}
          <div class="metier-section">
            <h3>{metier.nom}</h3>
            {#each metier.niveaux as niveau}
              {@const certsOfNiveau = prestataire.certifications.filter((c) => c.includes(`_niveau_${niveau.numero}`))}
              {#if certsOfNiveau.length > 0 || niveau.competences.length > 0}
                <div class="niveau-row" class:certified={certsOfNiveau.length > 0}>
                  <span class="niveau-label">Niveau {niveau.numero} — {niveau.nom}</span>
                  {#if certsOfNiveau.length > 0}
                    <span class="badge-gold"><Award size={10} /> Certifié</span>
                  {/if}
                </div>
                <div class="comp-list">
                  {#each niveau.competences as comp}
                    <span class="comp-chip">{comp.titre}</span>
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .profile-page { padding-bottom: 3rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.5rem; color: #028a15; font-size: 0.88rem; font-weight: 600; text-decoration: none; }
  .back-link:hover { text-decoration: underline; }
  .profile-header { display: flex; align-items: center; gap: 1.25rem; padding: 2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; margin-bottom: 1.25rem; }
  .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; flex-shrink: 0; }
  .profile-main { flex: 1; }
  .profile-main h1 { font-size: 1.5rem; font-weight: 800; color: #111827; margin: 0 0 0.2rem; }
  .profile-subtitle { font-size: 0.88rem; color: #6b7280; margin: 0; }
  .btn-contact { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem; border: none; border-radius: 10px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.88rem; text-decoration: none; cursor: pointer; }
  .btn-contact:hover { background: #028a15; text-decoration: none; }
  .btn-contact-outline { display: inline-flex; align-items: center; padding: 0.6rem 1.2rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #374151; font-family: inherit; font-weight: 600; font-size: 0.88rem; text-decoration: none; }
  .btn-contact-outline:hover { border-color: #03a71a; color: #047857; text-decoration: none; }
  .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.5rem; margin-bottom: 1.25rem; }
  .section-card h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem; font-weight: 700; color: #111827; margin: 0 0 1rem; }
  .cert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; }
  .cert-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff3cd; border-radius: 10px; border: 1px solid #fde68a; }
  .cert-card :global(.cert-icon) { color: #d97706; flex-shrink: 0; }
  .cert-name { display: block; font-size: 0.88rem; font-weight: 700; color: #111827; }
  .cert-code { font-size: 0.72rem; color: #92400e; font-weight: 600; }
  .metier-section { margin-bottom: 1.25rem; }
  .metier-section h3 { font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem; }
  .niveau-row { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; }
  .niveau-row.certified { color: #047857; }
  .niveau-label { font-size: 0.85rem; font-weight: 600; color: #374151; }
  .badge-gold { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 6px; background: #fff3cd; color: #8a6800; }
  .comp-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
  .comp-chip { font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: 6px; background: #f3f4f6; color: #374151; }
  .loading-state, .empty-state { text-align: center; padding: 3rem; color: #6b7280; }
  .empty-state h2 { color: #111827; }
  .alert-error { padding: 0.7rem 1rem; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; font-weight: 600; border: 1px solid #fecaca; }
  .muted { color: #9ca3af; font-size: 0.88rem; }
  @media (max-width: 600px) {
    .profile-header { flex-direction: column; text-align: center; }
    .cert-grid { grid-template-columns: 1fr; }
  }
</style>
