<script lang="ts">
  import DateRangePicker from "$lib/components/datetime/DateRangePicker.svelte";
  import { onMount } from "svelte";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { adminBookingDetail, adminDeleteBooking, adminEditBooking, adminListBookings, adminSetBookingStatus, type AdminBooking, type AdminBookingDetail, type AdminBookingList, type AdminBookingStatus } from "$lib/api/bookings";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Search from "@lucide/svelte/icons/search";
  import CalendarCheck from "@lucide/svelte/icons/calendar-check";
  import Phone from "@lucide/svelte/icons/phone";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  const pending = new Pending();
  const PAY_STATUS = { unpaid: "Non payé", partial: "Partiel", paid: "Payé" } as const;
  const MODE = { ALL: "Tout", PL: "Mise en relation", BK: "Service" } as const;
  const STATUS: Record<AdminBookingStatus, string> = { pending: "En attente", completed: "Terminée", cancelled: "Annulée" };
  const TABS: { key: string; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "pending", label: "En attente" },
    { key: "completed", label: "Terminées" },
    { key: "cancelled", label: "Annulées" },
  ];

  let data = $state<AdminBookingList | null>(null);
  let loading = $state(true);
  let status = $state("all");
  let q = $state("");
  let dateFrom = $state("");
  let dateTo = $state("");
  let page = $state(1);
  let detail = $state<AdminBookingDetail | null>(null);
  let cancelReason = $state("");
  // Modification des informations pratiques (réservation en attente) et suppression (réservation jamais payée)
  let editing = $state(false);
  let form = $state({ date: "", time: "", address: "", info: "", client_name: "", client_phone: "" });
  function startEdit() {
    if (!detail) return;
    form = { date: detail.date ?? "", time: detail.time ?? "", address: detail.address ?? "", info: detail.info ?? "", client_name: detail.client_name ?? "", client_phone: detail.client_phone ?? "" };
    editing = true;
  }
  async function saveEdit() {
    if (!detail) return;
    const id = detail.id;
    await pending.run("edit", async () => {
      try {
        await adminEditBooking(id, { ...form, date: form.date || undefined });
        snackbar.success("Réservation modifiée.");
        editing = false;
        detail = await adminBookingDetail(id);
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function removeBooking() {
    if (!detail) return;
    const d = detail;
    const ok = await confirmDialog.ask({
      title: "Supprimer cette réservation ?",
      message: `La réservation ${d.ref} sera définitivement supprimée. Possible uniquement si elle n'a jamais été payée ; sinon, annulez-la.`,
      confirmLabel: "Supprimer",
      tone: "danger",
      action: () => adminDeleteBooking(d.id),
    });
    if (!ok) return;
    snackbar.success("Réservation supprimée.");
    detail = null;
    await load();
  }
  let canManage = $derived(auth.can("academy.bookings.manage"));
  let pages = $derived(data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);

  let seq = 0;
  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const res = await adminListBookings({ status, q: q.trim(), date_from: dateFrom, date_to: dateTo, page, page_size: 20 });
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
    page = Math.min(Math.max(1, p), pages);
    load();
  }

  async function open(b: AdminBooking) {
    cancelReason = "";
    editing = false;
    await pending.run(`open:${b.id}`, async () => {
      try {
        detail = await adminBookingDetail(b.id);
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function change(next: "completed" | "cancelled") {
    if (!detail) return;
    const d = detail;
    const ok = await confirmDialog.ask({
      title: next === "completed" ? "Marquer comme terminée ?" : "Annuler cette réservation ?",
      message: next === "completed" ? `La mission ${d.ref} sera comptée dans les missions réalisées du prestataire.` : `La réservation ${d.ref} sera annulée. Cette action est définitive.`,
      confirmLabel: next === "completed" ? "Marquer terminée" : "Annuler la réservation",
      tone: next === "completed" ? "default" : "danger",
      action: () => adminSetBookingStatus(d.id, next, cancelReason.trim()),
    });
    if (!ok) return;
    snackbar.success(next === "completed" ? "Réservation marquée comme terminée." : "Réservation annulée.");
    detail = null;
    await load();
  }

  const money = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`);
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
  const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
  function optionLabel(o: unknown): string {
    if (typeof o === "string") return o;
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      return String(r.name ?? r.label ?? r.title ?? "") + (r.price ? ` (${money(r.price as number)})` : "");
    }
    return String(o);
  }
</script>

<div class="page">
  <p class="desc">Réservations passées par les clients pour le pays sélectionné. Les e-mails de confirmation partent automatiquement au client et à l'administration.</p>

  <div class="toolbar">
    <div class="tabs" role="tablist">
      {#each TABS as t (t.key)}
        <button role="tab" aria-selected={status === t.key} class:active={status === t.key} onclick={() => { status = t.key; refilter(); }}>
          {t.label}{#if data}<span class="n">{data.counts[t.key as keyof typeof data.counts]}</span>{/if}
        </button>
      {/each}
    </div>
    <div class="filters">
      <label class="search"><Search size={15} /><input type="search" placeholder="Réf., client, téléphone, prestataire…" bind:value={q} oninput={onSearch} /></label>
      <div class="range"><DateRangePicker bind:from={dateFrom} bind:to={dateTo} onchange={refilter} placeholder="Période du rendez-vous" /></div>
    </div>
  </div>

  {#if loading && !data}
    <div class="state">Chargement…</div>
  {:else if data && data.items.length === 0}
    <div class="state"><CalendarCheck size={28} /><p>Aucune réservation ne correspond.</p></div>
  {:else if data}
    <div class="list" class:dim={loading}>
      {#each data.items as b (b.id)}
        <button class="row" onclick={() => open(b)} disabled={pending.is(`open:${b.id}`)}>
          <div class="main">
            <span class="ref">{b.ref}</span>
            <span class="svc">{b.service ?? "Service"}{b.qty && b.qty > 1 ? ` × ${b.qty}` : ""}</span>
            <span class="sub">{b.client_name ?? "Client"} · {b.client_phone ?? "—"}</span>
          </div>
          <div class="mid">
            <span>{day(b.date)}{b.time ? ` · ${b.time}` : ""}</span>
            <span class="sub">{b.vendor_name ?? "—"}</span>
          </div>
          <div class="end">
            <strong>{money(b.total)}</strong>
            <span class="badge {b.status}">{STATUS[b.status]}</span>
          </div>
        </button>
      {/each}
    </div>
    {#if pages > 1}
      <div class="pager">
        <button onclick={() => go(page - 1)} disabled={page <= 1 || loading} aria-label="Page précédente"><ChevronLeft size={16} /></button>
        <span>Page {page} / {pages} · {data.total} réservations</span>
        <button onclick={() => go(page + 1)} disabled={page >= pages || loading} aria-label="Page suivante"><ChevronRight size={16} /></button>
      </div>
    {/if}
  {/if}
</div>

<Modal open={detail !== null} title={detail ? `Réservation ${detail.ref}` : ""} subtitle={detail ? `Reçue le ${stamp(detail.created_at)}` : ""} width="38rem" onclose={() => (detail = null)}>
  {#if detail}
    <div class="det">
      <span class="badge {detail.status}">{STATUS[detail.status]}</span>
      <dl>
        <dt>Service</dt><dd>{detail.service ?? "—"}{detail.qty ? ` × ${detail.qty}` : ""}</dd>
        {#if detail.options.length}<dt>Options</dt><dd>{detail.options.map(optionLabel).join(", ")}</dd>{/if}
        <dt>Date</dt><dd>{day(detail.date)}{detail.time ? ` à ${detail.time}` : ""}</dd>
        <dt>Client</dt><dd>{detail.client_name ?? "—"}<br /><a href={`tel:${detail.client_phone}`}><Phone size={12} /> {detail.client_phone ?? "—"}</a>{#if detail.client_email}<br />{detail.client_email}{/if}</dd>
        <dt>Prestataire</dt><dd>{detail.vendor_name ?? "—"}{#if detail.vendor_phone}<br /><a href={`tel:${detail.vendor_phone}`}><Phone size={12} /> {detail.vendor_phone}</a>{/if}</dd>
        <dt>Adresse</dt><dd>{detail.address ?? "—"}{detail.district ? `, ${detail.district}` : ""}{detail.city ? ` (${detail.city})` : ""}{#if detail.map_link}<br /><a href={detail.map_link} target="_blank" rel="noopener noreferrer"><MapPin size={12} /> Voir sur la carte</a>{/if}</dd>
        {#if detail.info}<dt>Précisions</dt><dd class="pre">{detail.info}</dd>{/if}
        <dt>Mode choisi</dt><dd>{detail.payment_method === "cash" ? "Espèces" : "En ligne"}</dd>
        {#if detail.coupon}<dt>Coupon</dt><dd>{detail.coupon}</dd>{/if}
        <dt>Frais de mise en relation</dt><dd>{money(detail.linking)}</dd>
        <dt>Total</dt><dd><strong>{money(detail.total)}</strong></dd>
        {#if detail.cancellation_reason}<dt>Motif d'annulation</dt><dd class="pre">{detail.cancellation_reason}</dd>{/if}
      </dl>
      <section class="paysec">
        <h4>Paiements <span class="pst {detail.payment.status}">{PAY_STATUS[detail.payment.status]}</span></h4>
        <div class="paygrid">
          <div><small>Total</small><strong>{money(detail.payment.total)}</strong></div>
          <div><small>Encaissé</small><strong>{money(detail.payment.paid)}</strong></div>
          <div><small>Reste</small><strong>{money(detail.payment.remaining)}</strong></div>
        </div>
        <ul class="parts">
          <li class:ok={detail.payment.linking_paid}>{detail.payment.linking_paid ? "✓" : "○"} Mise en relation · {money(detail.payment.linking)}</li>
          <li class:ok={detail.payment.service_paid}>{detail.payment.service_paid ? "✓" : "○"} Service · {money(detail.payment.service)}</li>
        </ul>
        {#if detail.invoices.length}
          <table class="inv">
            <thead><tr><th>Facture</th><th>Mode</th><th>Montant</th><th>Reçu</th><th>Date</th></tr></thead>
            <tbody>
              {#each detail.invoices as i (i.id)}
                <tr>
                  <td title={i.reference ?? ""}>{i.reference ? i.reference.slice(-8) : `#${i.id}`}</td>
                  <td>{MODE[i.mode ?? "ALL"]}</td>
                  <td>{money(i.amount)}</td>
                  <td class:ok={i.paid_amount > 0}>{i.paid_amount > 0 ? money(i.paid_amount) : "En attente"}</td>
                  <td>{stamp(i.paid_at ?? i.created_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="nopay">Aucune facture en ligne pour cette réservation.</p>
        {/if}
      </section>
      {#if editing}
        <section class="paysec edit">
          <h4>Modifier les informations</h4>
          <div class="eg">
            <label>Date<input type="date" bind:value={form.date} /></label>
            <label>Heure<input type="text" maxlength="20" placeholder="Ex. 14h00" bind:value={form.time} /></label>
            <label class="full">Adresse<input type="text" maxlength="500" bind:value={form.address} /></label>
            <label class="full">Précisions<textarea rows="2" maxlength="1000" bind:value={form.info}></textarea></label>
            <label>Nom du client<input type="text" maxlength="255" bind:value={form.client_name} /></label>
            <label>Téléphone du client<input type="tel" maxlength="50" bind:value={form.client_phone} /></label>
          </div>
          <div class="eb"><Btn class="btn-primary btn-sm" loading={pending.is("edit")} onclick={saveEdit}>Enregistrer</Btn><button type="button" class="btn btn-outline btn-sm" onclick={() => (editing = false)}>Annuler</button></div>
        </section>
      {/if}
      {#if canManage && detail.status === "pending" && !editing}
        <label class="reason">Motif (en cas d'annulation)
          <input type="text" maxlength="300" placeholder="Ex. prestataire indisponible" bind:value={cancelReason} />
        </label>
      {/if}
    </div>
  {/if}
  {#snippet footer()}
    {#if detail && canManage && detail.status === "pending"}
      {#if detail.payment.paid === 0}<Btn class="btn-outline btn-danger" onclick={removeBooking}>Supprimer</Btn>{/if}
      {#if !editing}<Btn class="btn-outline" onclick={startEdit}>Modifier</Btn>{/if}
      <Btn class="btn-outline btn-danger" onclick={() => change("cancelled")}>Annuler</Btn>
      <Btn class="btn-primary" onclick={() => change("completed")}>Marquer terminée</Btn>
    {:else}
      <Btn class="btn-outline" onclick={() => (detail = null)}>Fermer</Btn>
    {/if}
  {/snippet}
</Modal>

<style>
  .edit { border-top: 1px solid #e5e7eb; padding-top: 0.8rem; margin-top: 0.4rem; }
  .eg { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; } .eg label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; color: #6b7280; } .eg .full { grid-column: 1 / -1; }
  .eg input, .eg textarea { padding: 0.5rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; } .eb { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
  .page { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; }
  .toolbar { display: flex; flex-direction: column; gap: 0.75rem; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; overflow-x: auto; align-self: flex-start; max-width: 100%; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
  .n { background: #e5e7eb; border-radius: 999px; padding: 0 0.45rem; font-size: 0.7rem; }
  .filters { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .search { display: flex; align-items: center; gap: 0.4rem; flex: 1 1 16rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; }
  .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .search:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .range { width: 17.5rem; }
  .state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem 1rem; color: #9ca3af; }
  .list { display: flex; flex-direction: column; gap: 0.6rem; transition: opacity 0.15s; }
  .list.dim { opacity: 0.55; }
  .row { display: grid; grid-template-columns: 1.4fr 1fr auto; gap: 1rem; align-items: center; text-align: left; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; font: inherit; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
  .row:hover { border-color: #93c5fd; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
  .main, .mid, .end { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .end { align-items: flex-end; }
  .ref { font-size: 0.72rem; font-weight: 800; color: #2563eb; letter-spacing: 0.04em; }
  .svc { font-weight: 700; color: #111827; }
  .sub { font-size: 0.8rem; color: #6b7280; }
  .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; width: fit-content; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.completed { background: #d1fae5; color: #065f46; }
  .badge.cancelled { background: #fee2e2; color: #991b1b; }
  .pager { display: flex; justify-content: center; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #6b7280; }
  .pager button { display: inline-flex; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; cursor: pointer; }
  .pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  .det { display: flex; flex-direction: column; gap: 0.9rem; }
  dl { display: grid; grid-template-columns: 9rem 1fr; gap: 0.55rem 1rem; margin: 0; }
  dt { color: #6b7280; font-size: 0.8rem; }
  dd { margin: 0; color: #111827; font-size: 0.9rem; overflow-wrap: anywhere; }
  dd a { color: #2563eb; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; }
  .pre { white-space: pre-wrap; }
  .reason { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: #6b7280; }
  .reason input { padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; }
  .reason input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .paysec { padding: 0.9rem 1rem; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; display: flex; flex-direction: column; gap: 0.7rem; }
  .paysec h4 { margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
  .pst { padding: 0.1rem 0.55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
  .pst.unpaid { background: #fee2e2; color: #991b1b; }
  .pst.partial { background: #fef3c7; color: #92400e; }
  .pst.paid { background: #d1fae5; color: #065f46; }
  .paygrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
  .paygrid div { display: flex; flex-direction: column; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.5rem 0.7rem; }
  .paygrid small { color: #6b7280; font-size: 0.7rem; }
  .paygrid strong { font-size: 0.92rem; }
  .parts { display: flex; flex-wrap: wrap; gap: 0.3rem 1.2rem; margin: 0; padding: 0; list-style: none; font-size: 0.8rem; color: #6b7280; }
  .parts .ok { color: #065f46; font-weight: 700; }
  .inv { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
  .inv th { text-align: left; color: #6b7280; font-weight: 700; padding: 0.3rem 0.4rem; border-bottom: 1px solid #e5e7eb; }
  .inv td { padding: 0.35rem 0.4rem; border-bottom: 1px solid #f1f2f4; }
  .inv td.ok { color: #065f46; font-weight: 700; }
  .nopay { margin: 0; font-size: 0.8rem; color: #9ca3af; }
  @media (max-width: 720px) {
    .row { grid-template-columns: 1fr auto; }
    .mid { grid-column: 1 / -1; order: 3; }
    dl { grid-template-columns: 1fr; gap: 0.1rem; }
    dt { margin-top: 0.5rem; }
  }
</style>
