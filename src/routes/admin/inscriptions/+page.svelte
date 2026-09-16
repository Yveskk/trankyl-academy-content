<script lang="ts">
  import { adminListNiveauEnrollments } from "$lib/api/enrollments";
  import type { NiveauEnrollmentAdmin } from "$lib/api/types";
  import Calendar from "@lucide/svelte/icons/calendar";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";

  let enrollments = $state<NiveauEnrollmentAdmin[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    adminListNiveauEnrollments()
      .then((data) => (enrollments = data))
      .catch((e) => (error = (e as Error).message))
      .finally(() => (loading = false));
  });

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
</script>

<div class="inscriptions-page">
  <div class="page-header">
    <p class="header-desc">Apprenants inscrits à un niveau (cohorte avec date de début).</p>
  </div>

  {#if error}
    <div class="alert-error">{error}</div>
  {/if}

  <div class="stats-row">
    <div class="stat-card">
      <GraduationCap size={18} class="stat-icon" />
      <div><span class="stat-value">{enrollments.length}</span><span class="stat-label">Inscription(s)</span></div>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if enrollments.length === 0}
    <div class="empty-state">Aucune inscription à un niveau pour le moment.</div>
  {:else}
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Apprenant</th>
            <th>Métier</th>
            <th>Niveau</th>
            <th>Date de début</th>
            <th>Inscrit le</th>
          </tr>
        </thead>
        <tbody>
          {#each enrollments as e}
            <tr>
              <td>
                <span class="name-cell">{e.apprenant_nom}</span>
                <span class="muted" style="display:block">{e.apprenant_email}</span>
              </td>
              <td>{e.metier_nom}</td>
              <td>Niveau {e.niveau_numero} — {e.niveau_nom}</td>
              <td>
                <span class="badge-gold"><Calendar size={11} />{formatDate(e.date_debut)}</span>
              </td>
              <td class="date-cell">{formatDate(e.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .inscriptions-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
  .stat-card :global(.stat-icon) { color: #047857; }
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
  .badge-gold { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: #fff3cd; color: #8a6800; }
  .muted { color: #9ca3af; font-size: 0.78rem; }
  .alert-error { padding: 0.7rem 1rem; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; font-weight: 600; border: 1px solid #fecaca; }
  .loading-state, .empty-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
  @media (max-width: 900px) { .stats-row { grid-template-columns: 1fr; } .table-card { overflow-x: auto; } }
</style>
