<script lang="ts">
  import { onMount } from "svelte";
  import DataTable from "$lib/components/admin/DataTable.svelte";
  import type { Column } from "$lib/components/admin/table";
  import { adminListPayments, type AdminPayment, type AdminPaymentList } from "$lib/api/bookings";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Search from "@lucide/svelte/icons/search";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  const TABS = [
    { key: "all", label: "Tous" },
    { key: "paid", label: "Encaissés" },
    { key: "pending", label: "En attente" },
  ];
  const MODES = [
    { key: "all", label: "Tous les types" },
    { key: "ALL", label: "Service + mise en relation" },
    { key: "PL", label: "Mise en relation" },
    { key: "BK", label: "Service" },
  ];
  const PAGE_SIZE = 20;

  let data = $state<AdminPaymentList | null>(null);
  let loading = $state(true);
  let status = $state("all");
  let mode = $state("all");
  let q = $state("");
  let page = $state(1);

  let seq = 0;
  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const res = await adminListPayments({ status, mode, q: q.trim(), page, page_size: PAGE_SIZE });
      if (mine === seq) data = res;
    } catch (e) {
      if (mine === seq) snackbar.error((e as Error).message);
    } finally {
      if (mine === seq) loading = false;
    }
  }
  onMount(load);

  function refilter() {
    page = 1;
    load();
  }
  let timer: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(timer);
    timer = setTimeout(refilter, 350);
  }
  function go(p: number) {
    page = p;
    load();
  }

  const money = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`);
  const stamp = (iso: string | null) => (iso ? new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  const columns: Column<AdminPayment>[] = [
    { key: "created_at", label: "Facture du", width: "10.5rem", cell: dateCell },
    { key: "booking_ref", label: "Réservation", width: "10rem", cell: bookingCell },
    { key: "client_name", label: "Client", cell: clientCell },
    { key: "vendor_name", label: "Prestataire", width: "11rem", cell: vendorCell, hideOnSmall: true },
    { key: "mode_label", label: "Type", width: "11rem", cell: typeCell, hideOnSmall: true },
    { key: "amount", label: "Montant", width: "8.5rem", align: "right", cell: amountCell },
    { key: "paid_amount", label: "Encaissé", width: "10rem", align: "right", cell: paidCell },
    { key: "status", label: "Statut", width: "7.5rem", cell: statusCell },
  ];
</script>

{#snippet dateCell(r: AdminPayment)}<span class="sub dark">{stamp(r.created_at)}</span>{/snippet}
{#snippet bookingCell(r: AdminPayment)}
  <div class="stack"><a class="ref" href="/admin/reservations">{r.booking_ref}</a><span class="sub">{r.service ?? "—"}</span></div>
{/snippet}
{#snippet clientCell(r: AdminPayment)}
  <div class="stack"><strong>{r.client_name ?? "—"}</strong><span class="sub">{r.client_phone ?? ""}</span></div>
{/snippet}
{#snippet vendorCell(r: AdminPayment)}<span>{r.vendor_name ?? "—"}</span>{/snippet}
{#snippet typeCell(r: AdminPayment)}<span class="mode {r.mode ?? 'ALL'}">{r.mode_label}</span>{/snippet}
{#snippet amountCell(r: AdminPayment)}<strong>{money(r.amount)}</strong>{/snippet}
{#snippet paidCell(r: AdminPayment)}
  {#if r.paid_amount > 0}<div class="stack end"><strong class="ok">{money(r.paid_amount)}</strong><span class="sub">{stamp(r.paid_at)}</span></div>{:else}<span class="sub">—</span>{/if}
{/snippet}
{#snippet statusCell(r: AdminPayment)}<span class="badge {r.status}">{r.status === "paid" ? "Encaissé" : "En attente"}</span>{/snippet}
{#snippet rowActions(r: AdminPayment)}
  {#if r.bill_url && r.status === "pending"}<a class="lnk" href={r.bill_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Lien de paiement</a>{:else}<span class="sub">{r.reference ? r.reference.slice(-10) : ""}</span>{/if}
{/snippet}

<div class="page">
  <p class="desc">Registre des paiements en ligne des réservations du pays sélectionné : une ligne par facture (mise en relation, service ou les deux) avec ce qui a réellement été encaissé. Les paiements en espèces ne passent pas par ce registre.</p>

  <div class="kpis">
    <div class="kpi"><small>Encaissé</small><strong class="ok">{money(data?.collected ?? 0)}</strong><span>{data?.counts.paid ?? 0} paiement(s)</span></div>
    <div class="kpi"><small>En attente de paiement</small><strong>{money(data?.awaiting ?? 0)}</strong><span>{data?.counts.pending ?? 0} facture(s)</span></div>
    <div class="kpi"><small>Factures émises</small><strong>{data?.counts.all ?? 0}</strong><span>tous types</span></div>
  </div>

  <div class="toolbar">
    <div class="tabs" role="tablist">
      {#each TABS as t (t.key)}
        <button role="tab" aria-selected={status === t.key} class:active={status === t.key} onclick={() => { status = t.key; refilter(); }}>
          {t.label}{#if data}<span class="n">{data.counts[t.key as keyof typeof data.counts]}</span>{/if}
        </button>
      {/each}
    </div>
    <div class="filters">
      <select bind:value={mode} onchange={refilter} aria-label="Type de paiement">{#each MODES as m (m.key)}<option value={m.key}>{m.label}</option>{/each}</select>
      <label class="search"><Search size={15} /><input type="search" placeholder="Réf., client, téléphone, prestataire…" bind:value={q} oninput={onSearch} /></label>
    </div>
  </div>

  <DataTable
    {columns}
    rows={data?.items ?? []}
    rowKey={(r) => r.id}
    {loading}
    {page}
    pageSize={PAGE_SIZE}
    total={data?.total ?? 0}
    itemLabel="paiements"
    emptyTitle="Aucun paiement"
    emptyText="Les paiements en ligne des réservations apparaîtront ici."
    onpage={go}
    actions={rowActions}
    actionsLabel="Détail"
    actionsWidth="10rem"
  />
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; max-width: 56rem; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.8rem; }
  .kpi { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.9rem 1.1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
  .kpi small { color: #6b7280; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi strong { font-size: 1.35rem; color: #111827; }
  .kpi span { color: #9ca3af; font-size: 0.78rem; }
  .ok { color: #047857 !important; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; overflow-x: auto; max-width: 100%; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
  .n { background: #e5e7eb; border-radius: 999px; padding: 0 0.45rem; font-size: 0.7rem; }
  .filters { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .filters select { padding: 0.5rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; font: inherit; font-size: 0.85rem; }
  .search { display: flex; align-items: center; gap: 0.4rem; min-width: 16rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; }
  .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .search:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .stack { display: flex; flex-direction: column; gap: 0.12rem; min-width: 0; }
  .stack.end { align-items: flex-end; }
  .ref { font-size: 0.78rem; font-weight: 800; color: #2563eb; letter-spacing: 0.03em; text-decoration: none; }
  .sub { font-size: 0.78rem; color: #6b7280; }
  .sub.dark { color: #374151; }
  .mode { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: #e0e7ff; color: #3730a3; }
  .mode.PL { background: #fce7f3; color: #9d174d; }
  .mode.BK { background: #cffafe; color: #155e75; }
  .badge { display: inline-block; padding: 0.18rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .badge.paid { background: #d1fae5; color: #065f46; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .lnk { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 700; color: #2563eb; text-decoration: none; }
</style>
