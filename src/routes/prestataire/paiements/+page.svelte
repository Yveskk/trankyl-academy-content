<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { getPayments, type Payments } from "$lib/api/providerSpace";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let d = $state<Payments | null>(null);
  onMount(async () => {
    try {
      d = await getPayments();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  });
  const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
  const max = $derived(Math.max(1, ...(d?.months.map((m) => m.amount) ?? [1])));
  const monthName = (m: string) => new Date(m + "-15").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
</script>

<div class="pw">
  <div><h1>Paiements</h1><p class="pw-sub">Ce que vous avez gagné sur les missions terminées, et ce qu'il vous reste à recevoir.</p></div>
  {#if !d}<div class="pw-empty">Chargement…</div>{:else}
    <div class="pw-kpis">
      <div class="pw-kpi"><small>Revenus du mois</small><strong>{money(d.totals.month)}</strong></div>
      <div class="pw-kpi"><small>Total gagné</small><strong>{money(d.totals.earned)}</strong><small>{d.totals.completed_count} mission(s) terminée(s)</small></div>
      <div class="pw-kpi"><small>À recevoir</small><strong>{money(d.totals.to_receive)}</strong><small>missions terminées non payées</small></div>
      <div class="pw-kpi"><small>Missions en attente</small><strong>{money(d.totals.pending_missions)}</strong><small>pas encore terminées</small></div>
    </div>
    <div class="pw-grid2">
      <section class="pw-box"><h2>6 derniers mois</h2>
        {#if d.months.length === 0}<p class="pw-muted">Pas encore de revenus.</p>{/if}
        <div class="bars">{#each d.months as m (m.month)}<div class="b"><span class="v">{money(m.amount)}</span><i style:height="{Math.max(6, (m.amount / max) * 100)}%"></i><span>{monthName(m.month)}</span></div>{/each}</div>
      </section>
      <section class="pw-box"><h2>Dernières missions</h2>
        {#each d.items.slice(0, 10) as i (i.id)}<div class="ln"><div><span class="pw-ref">{i.ref}</span><span class="pw-sm">{i.service ?? "Service"} · {i.client_name ?? "Client"}</span></div><div class="r"><strong>{money(i.total)}</strong><span class="pw-badge {i.status === 'completed' ? (i.paid ? 'completed' : 'pending') : i.status}">{i.status === "completed" ? (i.paid ? "Payée" : "À recevoir") : i.status === "pending" ? "En attente" : "Annulée"}</span></div></div>{:else}<p class="pw-muted">Aucune mission.</p>{/each}
      </section>
    </div>
  {/if}
</div>

<style>
  .bars { display: flex; align-items: flex-end; gap: 0.8rem; height: 11rem; padding-top: 1.4rem; }
  .b { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 0.3rem; font-size: 0.74rem; color: #6b7280; }
  .b i { width: 100%; max-width: 3rem; background: #ffc72c; border-radius: 8px 8px 0 0; display: block; }
  .b .v { font-weight: 700; color: #1d2230; font-size: 0.7rem; white-space: nowrap; }
  .ln { display: flex; justify-content: space-between; gap: 0.8rem; padding: 0.55rem 0; border-top: 1px solid #f0f1f3; align-items: center; }
  .ln > div { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .ln .r { align-items: flex-end; }
</style>
