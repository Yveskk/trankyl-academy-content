<script lang="ts">
  import { onMount } from "svelte";
  import Calendar from "@lucide/svelte/icons/calendar-check";
  import Wallet from "@lucide/svelte/icons/wallet";
  import Users from "@lucide/svelte/icons/users";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import CreditCard from "@lucide/svelte/icons/credit-card";
  import Star from "@lucide/svelte/icons/star";
  import Inbox from "@lucide/svelte/icons/inbox";
  import { adminOperations, type Ops } from "$lib/api/adminDashboard";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let ops = $state<Ops | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      ops = await adminOperations();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const monthLabel = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1] ?? m;
  const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
  const ST = { pending: "En attente", completed: "Terminée", cancelled: "Annulée" } as const;

  const maxRev = $derived(Math.max(1, ...(ops?.charts.revenueByMonth ?? []).map((m) => m.amount)));
  const cards = $derived(
    ops
      ? [
          { icon: Calendar, label: "Réservations", value: fmt(ops.kpis.bookingsTotal), sub: `${ops.kpis.bookingsThisMonth} ce mois · ${ops.kpis.bookingsToday} aujourd'hui`, color: "#2563eb" },
          { icon: Wallet, label: "Revenus (missions terminées)", value: `${fmt(ops.kpis.revenueTotal)} F`, sub: `${fmt(ops.kpis.revenueThisMonth)} F ce mois`, color: "#059669" },
          { icon: Users, label: "Clients", value: fmt(ops.kpis.clientsTotal), sub: `${ops.kpis.clientsActiveThisMonth} actifs ce mois`, color: "#7c3aed" },
          { icon: Briefcase, label: "Prestataires", value: fmt(ops.kpis.vendorsTotal), sub: `${ops.kpis.vendorsActive} actifs · ${ops.kpis.vendorsThisMonth} nouveaux ce mois`, color: "#d97706" },
          { icon: CreditCard, label: "Abonnements actifs", value: fmt(ops.kpis.subscriptionsActive), sub: `${ops.kpis.vendorsWithSubscription} prestataire(s) abonné(s)`, color: "#0891b2" },
          { icon: Briefcase, label: "Services", value: fmt(ops.kpis.servicesTotal), sub: `${ops.kpis.servicesActive} visibles`, color: "#be185d" },
          { icon: Inbox, label: "Mises en relation en attente", value: fmt(ops.kpis.contactRequestsPending), sub: "à traiter", color: "#dc2626" },
          { icon: Star, label: "Note moyenne", value: ops.kpis.avgRating !== null ? `${ops.kpis.avgRating} / 5` : "—", sub: `${ops.kpis.reviewsTotal} avis publiés`, color: "#ca8a04" },
        ]
      : [],
  );
</script>

<section class="ops">
  <h2>Exploitation</h2>
  {#if loading}<p class="hint">Chargement des indicateurs…</p>
  {:else if ops}
    <div class="grid">
      {#each cards as c (c.label)}
        {@const Icon = c.icon}
        <div class="card"><span class="ic" style="background:{c.color}15;color:{c.color}"><Icon size={20} /></span><div><strong>{c.value}</strong><small>{c.label}</small><em>{c.sub}</em></div></div>
      {/each}
    </div>

    <div class="cols">
      <div class="panel wide">
        <h3>Revenus des 6 derniers mois</h3>
        <div class="bars" role="img" aria-label="Revenus par mois">
          {#each ops.charts.revenueByMonth as m (m.month)}
            <div class="bar"><span class="val">{m.amount ? fmt(m.amount) : ""}</span><span class="fill" style="height:{Math.max(m.amount ? 4 : 1, (m.amount / maxRev) * 100)}%"></span><small>{monthLabel(m.month)}</small></div>
          {/each}
        </div>
      </div>

      <div class="panel">
        <h3>Réservations par statut</h3>
        {#each ops.charts.bookingsByStatus as s (s.key)}
          {@const total = ops.charts.bookingsByStatus.reduce((n, x) => n + x.count, 0) || 1}
          <div class="hb"><span>{s.label}</span><div class="track"><i class={s.key} style="width:{(s.count / total) * 100}%"></i></div><b>{s.count}</b></div>
        {/each}
        <h3 class="sp">Paiement</h3>
        {#each ops.charts.bookingsByPaymentStatus as s (s.label)}
          {@const total = ops.charts.bookingsByPaymentStatus.reduce((n, x) => n + x.count, 0) || 1}
          <div class="hb"><span>{s.label}</span><div class="track"><i class="pay" style="width:{(s.count / total) * 100}%"></i></div><b>{s.count}</b></div>
        {/each}
      </div>

      <div class="panel">
        <h3>Par catégorie</h3>
        {#each ops.charts.bookingsByCategory as s (s.label)}
          {@const top = Math.max(1, ...ops.charts.bookingsByCategory.map((x) => x.count))}
          <div class="hb"><span>{s.label}</span><div class="track"><i class="cat" style="width:{(s.count / top) * 100}%"></i></div><b>{s.count}</b></div>
        {:else}<p class="hint">Pas encore de réservation.</p>{/each}
        <h3 class="sp">Moyens de paiement</h3>
        {#each ops.charts.bookingsByPaymentMethod as s (s.label)}
          {@const top = Math.max(1, ...ops.charts.bookingsByPaymentMethod.map((x) => x.count))}
          <div class="hb"><span>{s.label === "cash" ? "Espèces" : s.label === "online" ? "En ligne" : s.label}</span><div class="track"><i class="cat" style="width:{(s.count / top) * 100}%"></i></div><b>{s.count}</b></div>
        {/each}
      </div>

      <div class="panel">
        <h3>Meilleurs prestataires</h3>
        {#each ops.topVendors as v, i (v.id)}
          <a class="li" href={`/admin/prestataires/${v.id}`}><span class="rk">{i + 1}</span><span class="nm">{v.name}</span><span class="sm">{v.missions} mission(s)</span><b>{fmt(v.revenue)} F</b></a>
        {:else}<p class="hint">Aucune mission terminée pour le moment.</p>{/each}
      </div>

      <div class="panel">
        <h3>Dernières réservations</h3>
        {#each ops.recentBookings as b (b.id)}
          <a class="li" href="/admin/reservations"><span class="nm"><strong>{b.ref}</strong> · {b.service ?? "—"}<small>{b.client ?? "—"} → {b.vendor ?? "—"}</small></span><span class="st {b.status}">{ST[b.status]}</span><small>{when(b.created_at)}</small></a>
        {:else}<p class="hint">Aucune réservation.</p>{/each}
      </div>

      <div class="panel">
        <h3>Dernières mises en relation</h3>
        {#each ops.recentContactRequests as c (c.id)}
          <a class="li" href="/admin/contacts"><span class="nm">{c.client ?? "—"} → {c.vendor ?? "—"}</span><span class="st {c.status}">{c.status === "pending" ? "À traiter" : c.status === "approved" ? "Acceptée" : "Refusée"}</span><small>{when(c.created_at)}</small></a>
        {:else}<p class="hint">Aucune demande.</p>{/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .ops { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; } .ops h2 { margin: 0; font-size: 1.15rem; } .hint { margin: 0; color: #9ca3af; font-size: 0.85rem; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.8rem; } .card { display: flex; gap: 0.8rem; align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 0.9rem 1rem; }
  .ic { flex: none; width: 2.6rem; height: 2.6rem; border-radius: 12px; display: grid; place-items: center; } .card div { display: flex; flex-direction: column; min-width: 0; } .card strong { font-size: 1.4rem; line-height: 1.15; } .card small { color: #4b5563; font-size: 0.78rem; font-weight: 600; } .card em { color: #9ca3af; font-style: normal; font-size: 0.74rem; }
  .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; } .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; } .panel.wide { grid-column: 1 / -1; } .panel h3 { margin: 0 0 0.3rem; font-size: 0.95rem; } .panel h3.sp { margin-top: 0.8rem; }
  .bars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.8rem; align-items: end; height: 11rem; } .bar { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 0.25rem; height: 100%; } .bar .fill { width: 70%; max-width: 3.5rem; background: linear-gradient(180deg, #34d399, #059669); border-radius: 6px 6px 0 0; min-height: 2px; } .bar .val { font-size: 0.68rem; color: #4b5563; font-weight: 700; } .bar small { color: #6b7280; font-size: 0.74rem; }
  .hb { display: grid; grid-template-columns: 8rem 1fr 2.2rem; gap: 0.6rem; align-items: center; font-size: 0.82rem; } .hb span { color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .hb b { text-align: right; } .track { height: 8px; background: #f3f4f6; border-radius: 99px; overflow: hidden; } .track i { display: block; height: 100%; border-radius: 99px; } i.pending { background: #f59e0b; } i.completed { background: #10b981; } i.cancelled { background: #ef4444; } i.pay { background: #3b82f6; } i.cat { background: #8b5cf6; }
  .li { display: flex; align-items: center; gap: 0.7rem; padding: 0.45rem 0; border-top: 1px solid #f1f2f4; text-decoration: none; color: #111827; font-size: 0.85rem; } .li:first-of-type { border-top: none; } .li:hover .nm { text-decoration: underline; } .rk { flex: none; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #f3f4f6; display: grid; place-items: center; font-weight: 800; font-size: 0.75rem; }
  .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; } .nm small, .sm, .li > small { color: #6b7280; font-size: 0.75rem; } .st { padding: 0.1rem 0.55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; background: #f3f4f6; } .st.pending { background: #fef3c7; color: #92400e; } .st.completed, .st.approved { background: #d1fae5; color: #065f46; } .st.cancelled, .st.rejected { background: #fee2e2; color: #991b1b; }
  @media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 760px) { .cols { grid-template-columns: 1fr; } .hb { grid-template-columns: 6rem 1fr 2rem; } }
</style>
