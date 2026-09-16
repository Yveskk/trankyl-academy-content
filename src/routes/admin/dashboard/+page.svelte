<script lang="ts">
  import { onMount } from "svelte";
  import { listMetiers } from "$lib/api/taxonomy";
  import { listModules } from "$lib/api/curriculum";
  import Layers from "@lucide/svelte/icons/layers";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Award from "@lucide/svelte/icons/award";
  import Users from "@lucide/svelte/icons/users";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  let metierCount = $state(0);
  let moduleCount = $state(0);
  let loading = $state(true);

  onMount(async () => {
    try {
      const metiers = await listMetiers();
      metierCount = metiers.length;
      const modules = await listModules();
      moduleCount = modules.length;
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  });

  const stats = $derived([
    { label: "Métiers", value: metierCount, icon: Layers, color: "#03a71a" },
    { label: "Modules", value: moduleCount, icon: BookOpen, color: "#2563eb" },
    { label: "Quiz créés", value: "6", icon: Award, color: "#d97706" },
    { label: "Apprenants", value: "—", icon: Users, color: "#7c3aed" },
  ]);

  const quickLinks = [
    { href: "/admin/taxonomy", label: "Gérer la taxonomie", desc: "Métiers, niveaux et compétences" },
    { href: "/admin/curriculum", label: "Gérer le curriculum", desc: "Modules et quiz de formation" },
    { href: "/", label: "Voir le site public", desc: "Prévisualiser le site apprenant" },
  ];
</script>

<div class="dashboard">
  <!-- Stats Grid -->
  <div class="stats-grid">
    {#each stats as stat}
      {@const Icon = stat.icon}
      <div class="stat-card-admin">
        <div class="stat-icon" style="background: {stat.color}15; color: {stat.color};">
          <Icon size={22} />
        </div>
        <div class="stat-body">
          <span class="stat-value">{stat.value}</span>
          <span class="stat-label">{stat.label}</span>
        </div>
      </div>
    {/each}
  </div>

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

  <!-- System Info -->
  <div class="section-card">
    <h2>Informations système</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">API Backend</span>
        <span class="info-value badge-green">FastAPI — localhost:8000</span>
      </div>
      <div class="info-row">
        <span class="info-label">Frontend</span>
        <span class="info-value badge-green">SvelteKit — localhost:5173</span>
      </div>
      <div class="info-row">
        <span class="info-label">Base de données</span>
        <span class="info-value badge-green">MySQL — trankyln_academy</span>
      </div>
      <div class="info-row">
        <span class="info-label">Licence contenu</span>
        <span class="info-value">CC-BY-4.0</span>
      </div>
      <div class="info-row">
        <span class="info-label">Licence code</span>
        <span class="info-value">MIT</span>
      </div>
    </div>
  </div>
</div>

<style>
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

  .section-card {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    padding: 1.5rem;
  }

  .section-card h2 {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1rem;
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

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  .info-value {
    font-size: 0.82rem;
    font-weight: 600;
    color: #6b7280;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    background: #f3f4f6;
  }

  .badge-green {
    background: #ecfdf5 !important;
    color: #047857 !important;
  }

  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
