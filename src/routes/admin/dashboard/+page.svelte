<script lang="ts">
  import { onMount } from "svelte";
  import { adminListMetiers } from "$lib/api/taxonomy";
  import { listModules } from "$lib/api/curriculum";
  import { adminListNiveauEnrollments } from "$lib/api/enrollments";
  import { listApprenants } from "$lib/api/matching";
  import { adminListArticles } from "$lib/api/blog";
  import type { ApprenantDetail } from "$lib/api/types";
  import OpsDashboard from "$lib/components/admin/OpsDashboard.svelte";
  import Layers from "@lucide/svelte/icons/layers";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Award from "@lucide/svelte/icons/award";
  import Users from "@lucide/svelte/icons/users";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Newspaper from "@lucide/svelte/icons/newspaper";
  import Gauge from "@lucide/svelte/icons/gauge";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  let loading = $state(true);
  let apprenants = $state<ApprenantDetail[]>([]);

  let metierCount = $state(0);
  let metierActiveCount = $state(0);
  let moduleCount = $state(0);
  let quizCount = $state(0);
  let niveauEnrollmentCount = $state(0);
  let blogCount = $state(0);
  let blogPublishedCount = $state(0);

  onMount(async () => {
    try {
      const [allMetiers, modules, niveauEnrollments, apprenantList, articles] = await Promise.all([
        adminListMetiers(),
        listModules(),
        adminListNiveauEnrollments(),
        listApprenants(),
        adminListArticles(),
      ]);

      metierCount = allMetiers.length;
      metierActiveCount = allMetiers.filter((m) => m.is_active).length;
      moduleCount = modules.length;
      quizCount = modules.filter((m) => m.has_quiz).length;
      niveauEnrollmentCount = niveauEnrollments.length;
      blogCount = articles.length;
      blogPublishedCount = articles.filter((a) => a.is_active).length;
      apprenants = apprenantList;
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  });

  let verifiedCount = $derived(apprenants.filter((a) => a.is_verified).length);
  let certificationCount = $derived(apprenants.reduce((sum, a) => sum + a.certifications.length, 0));
  let avgTrustScore = $derived.by(() => {
    const scored = apprenants.filter((a) => a.trust_score !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, a) => sum + (a.trust_score ?? 0), 0) / scored.length);
  });
  let recentApprenants = $derived(apprenants.slice(0, 6));

  const stats = $derived([
    { label: "Métiers actifs", value: `${metierActiveCount}/${metierCount}`, icon: Layers, color: "#03a71a" },
    { label: "Modules", value: moduleCount, icon: BookOpen, color: "#2563eb" },
    { label: "Quiz créés", value: quizCount, icon: Award, color: "#d97706" },
    { label: "Apprenants", value: apprenants.length, icon: Users, color: "#7c3aed" },
    { label: "Apprenants vérifiés", value: verifiedCount, icon: ShieldCheck, color: "#059669" },
    { label: "Certifications délivrées", value: certificationCount, icon: GraduationCap, color: "#dc2626" },
    { label: "Inscriptions niveau", value: niveauEnrollmentCount, icon: Layers, color: "#0891b2" },
    { label: "Articles publiés", value: `${blogPublishedCount}/${blogCount}`, icon: Newspaper, color: "#be185d" },
  ]);

  const quickLinks = [
    { href: "/admin/taxonomy", label: "Gérer la taxonomie", desc: "Métiers, niveaux et compétences" },
    { href: "/admin/curriculum", label: "Gérer le curriculum", desc: "Modules et quiz de formation" },
    { href: "/admin/apprenants", label: "Gérer les apprenants", desc: "Vérification et références" },
    { href: "/admin/blog", label: "Gérer le blog", desc: "Créer et publier des articles" },
    { href: "/", label: "Voir le site public", desc: "Prévisualiser le site apprenant" },
  ];

  function scoreColor(score: number | null): string {
    if (score === null) return "#9ca3af";
    if (score >= 70) return "#047857";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  }
</script>

<div class="dashboard">
  <OpsDashboard />

  <h2 class="ac-title">Académie</h2>
  <!-- Stats Grid -->
  <div class="stats-grid">
    {#each stats as stat}
      {@const Icon = stat.icon}
      <div class="stat-card-admin">
        <div class="stat-icon" style="background: {stat.color}15; color: {stat.color};">
          <Icon size={22} />
        </div>
        <div class="stat-body">
          <span class="stat-value">{loading ? "…" : stat.value}</span>
          <span class="stat-label">{stat.label}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="grid-2col">
    <!-- Quick Actions -->
    <div class="section-card">
      <h2>Actions rapides</h2>
      <div class="quick-links">
        {#each quickLinks as link}
          <a href={link.href} class="quick-link-card">
            <div class="quick-link-info">
              <h3>{link.label}</h3>
              <p>{link.desc}</p>
            </div>
            <ArrowRight size={18} class="arrow-icon" />
          </a>
        {/each}
      </div>
    </div>

    <!-- Recent learners -->
    <div class="section-card">
      <div class="section-head-row">
        <h2>Derniers apprenants inscrits</h2>
        {#if avgTrustScore !== null}
          <span class="avg-trust" style="color: {scoreColor(avgTrustScore)}">
            <Gauge size={14} /> Confiance moyenne : {avgTrustScore}/100
          </span>
        {/if}
      </div>
      {#if loading}
        <p class="empty-hint">Chargement...</p>
      {:else if recentApprenants.length === 0}
        <p class="empty-hint">Aucun apprenant pour le moment.</p>
      {:else}
        <div class="learners-list">
          {#each recentApprenants as a}
            <a href="/admin/apprenants" class="learner-row">
              <div class="learner-info">
                <span class="learner-name">{a.firstname} {a.lastname}</span>
                <span class="learner-email">{a.email}</span>
              </div>
              <div class="learner-badges">
                {#if a.certifications.length > 0}
                  <span class="mini-badge cert"><Award size={11} />{a.certifications.length}</span>
                {/if}
                {#if a.trust_score !== null}
                  <span class="mini-badge" style="color: {scoreColor(a.trust_score)}">{a.trust_score}</span>
                {/if}
                <span class="mini-badge" class:verified={a.is_verified}>
                  <ShieldCheck size={11} />{a.is_verified ? "Vérifié" : "Non vérifié"}
                </span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .ac-title { margin: 0.4rem 0 -0.2rem; font-size: 1.15rem; }
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-card-admin {
    background: #fff;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid #e5e7eb;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: #111827;
    line-height: 1.1;
  }

  .stat-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b7280;
  }

  .grid-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .section-card {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 1.5rem;
  }

  .section-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .section-card h2 {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .avg-trust {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .quick-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quick-link-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-radius: 10px;
    border: 1px solid #f3f4f6;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
  }

  .quick-link-card:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    text-decoration: none;
  }

  .quick-link-info h3 {
    font-size: 0.9rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.2rem;
  }

  .quick-link-info p {
    font-size: 0.78rem;
    color: #6b7280;
    margin: 0;
  }

  :global(.arrow-icon) {
    color: #9ca3af;
  }

  .empty-hint {
    font-size: 0.85rem;
    color: #9ca3af;
    text-align: center;
    padding: 1.5rem 0;
    margin: 0;
  }

  .learners-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .learner-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    border-bottom: 1px solid #f3f4f6;
  }

  .learner-row:last-child {
    border-bottom: none;
  }

  .learner-row:hover {
    background: #f9fafb;
    text-decoration: none;
  }

  .learner-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .learner-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #111827;
  }

  .learner-email {
    font-size: 0.72rem;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .learner-badges {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .mini-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    background: #f3f4f6;
    color: #6b7280;
  }

  .mini-badge.cert {
    background: #fef3c7;
    color: #92400e;
  }

  .mini-badge.verified {
    background: #ecfdf5;
    color: #047857;
  }

  @media (max-width: 1100px) {
    .grid-2col {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
