<script lang="ts">
  import { onMount } from "svelte";
  import { listApprenants } from "$lib/api/matching";
  import type { ApprenantDetail } from "$lib/api/types";
  import Award from "@lucide/svelte/icons/award";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import Users from "@lucide/svelte/icons/users";

  let apprenants = $state<ApprenantDetail[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(() => {
    listApprenants()
      .then((data) => (apprenants = data))
      .catch((e) => (error = (e as Error).message))
      .finally(() => (loading = false));
  });

  const stats = $derived({
    total: apprenants.length,
    certified: apprenants.filter((a) => a.certifications.length > 0).length,
    inProgress: apprenants.filter((a) => a.enrollment_count > 0 && a.completed_count === 0).length,
  });
</script>

<div class="learners-page">
  <div class="page-header">
    <p class="header-desc">Gestion des apprenants inscrits à Trankyl Academy.</p>
  </div>

  {#if error}
    <div class="alert-error">{error}</div>
  {/if}

  <!-- Stats -->
  <div class="stats-row">
    <div class="stat-card">
      <Users size={18} class="stat-icon" />
      <div><span class="stat-value">{stats.total}</span><span class="stat-label">Inscrits</span></div>
    </div>
    <div class="stat-card gold">
      <Award size={18} class="stat-icon" />
      <div><span class="stat-value">{stats.certified}</span><span class="stat-label">Certifiés</span></div>
    </div>
    <div class="stat-card blue">
      <BookOpen size={18} class="stat-icon" />
      <div><span class="stat-value">{stats.inProgress}</span><span class="stat-label">En cours</span></div>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if apprenants.length === 0}
    <div class="empty-state">Aucun apprenant inscrit.</div>
  {:else}
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Inscriptions</th>
            <th>Terminés</th>
            <th>Certifications</th>
            <th>Inscrit le</th>
          </tr>
        </thead>
        <tbody>
          {#each apprenants as a}
            <tr>
              <td class="name-cell">{a.firstname} {a.lastname}</td>
              <td>{a.email}</td>
              <td>{a.phone ?? "—"}</td>
              <td><span class="badge-muted">{a.enrollment_count}</span></td>
              <td><span class="badge-green">{a.completed_count}</span></td>
              <td>
                {#if a.certifications.length > 0}
                  <div class="cert-list">
                    {#each a.certifications as cert}
                      <span class="badge-gold"><Award size={10} /> {cert}</span>
                    {/each}
                  </div>
                {:else}
                  <span class="muted">Aucune</span>
                {/if}
              </td>
              <td class="date-cell">{new Date(a.created_at).toLocaleDateString("fr-FR")}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .learners-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
  .stat-card :global(.stat-icon) { color: #047857; }
  .stat-card.gold :global(.stat-icon) { color: #d97706; }
  .stat-card.blue :global(.stat-icon) { color: #2563eb; }
  .stat-value { display: block; font-size: 1.5rem; font-weight: 800; color: #111827; line-height: 1.1; }
  .stat-label { font-size: 0.78rem; font-weight: 600; color: #6b7280; }
  .table-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  td { padding: 0.75rem 1rem; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f9fafb; }
  .name-cell { font-weight: 700; color: #111827; }
  .date-cell { color: #9ca3af; font-size: 0.8rem; }
  .cert-list { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .badge-muted { display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #f3f4f6; color: #6b7280; }
  .badge-green { display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #ecfdf5; color: #047857; }
  .badge-gold { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #fff3cd; color: #8a6800; }
  .muted { color: #9ca3af; font-size: 0.82rem; }
  .alert-error { padding: 0.7rem 1rem; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; font-weight: 600; border: 1px solid #fecaca; }
  .loading-state, .empty-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
  @media (max-width: 900px) { .stats-row { grid-template-columns: 1fr; } .table-card { overflow-x: auto; } }
</style>
