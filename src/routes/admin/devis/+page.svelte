<script lang="ts">
  import { onMount } from "svelte";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import DataTable from "$lib/components/admin/DataTable.svelte";
  import type { Column } from "$lib/components/admin/table";
  import { adminListQuotes, adminReplyQuote, type AdminQuote, type AdminQuoteList, type QuoteStatus } from "$lib/api/quotes";
  import { auth } from "$lib/stores/auth.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Search from "@lucide/svelte/icons/search";
  import Reply from "@lucide/svelte/icons/reply";
  import Eye from "@lucide/svelte/icons/eye";
  import Phone from "@lucide/svelte/icons/phone";
  import Mail from "@lucide/svelte/icons/mail";

  const STATUS: Record<QuoteStatus, string> = { new: "À traiter", answered: "Répondu" };
  const TABS = [
    { key: "all", label: "Tous" },
    { key: "new", label: "À traiter" },
    { key: "answered", label: "Répondus" },
  ];
  const PAGE_SIZE = 15;

  let data = $state<AdminQuoteList | null>(null);
  let loading = $state(true);
  let status = $state("all");
  let q = $state("");
  let page = $state(1);
  let canManage = $derived(auth.can("academy.quotes.manage"));

  // Modale de reponse
  let target = $state<AdminQuote | null>(null);
  let subject = $state("");
  let message = $state("");
  let sending = $state(false);

  let seq = 0;
  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const res = await adminListQuotes({ status, q: q.trim(), page, page_size: PAGE_SIZE });
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

  function openReply(row: AdminQuote) {
    target = row;
    subject = row.reply_subject ?? (row.lang === "en" ? `Your quote request${row.vendor_name ? ` — ${row.vendor_name}` : ""}` : `Réponse à votre demande de devis${row.vendor_name ? ` — ${row.vendor_name}` : ""}`);
    message = "";
  }

  async function send(event: SubmitEvent) {
    event.preventDefault();
    if (!target) return;
    sending = true;
    try {
      await adminReplyQuote(target.id, subject.trim(), message.trim());
      snackbar.success(`Réponse envoyée à ${target.email}.`);
      target = null;
      await load();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      sending = false;
    }
  }

  const stamp = (iso: string | null) => (iso ? new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  const excerpt = (t: string, n = 90) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

  const columns: Column<AdminQuote>[] = [
    { key: "id", label: "N°", width: "4.5rem", cell: refCell },
    { key: "name", label: "Demandeur", width: "17rem", cell: whoCell },
    { key: "vendor_name", label: "Prestataire", width: "11rem", cell: vendorCell, hideOnSmall: true },
    { key: "message", label: "Demande", cell: msgCell },
    { key: "created_at", label: "Reçu le", width: "10rem", cell: dateCell, hideOnSmall: true },
    { key: "status", label: "Statut", width: "7.5rem", cell: statusCell },
  ];
</script>

{#snippet refCell(r: AdminQuote)}<span class="ref">#{r.id}</span>{/snippet}
{#snippet whoCell(r: AdminQuote)}
  <div class="stack">
    <strong>{r.name}{#if r.client_id}<span class="tag">Compte client</span>{/if}</strong>
    <span class="sub"><Mail size={12} /> {r.email}</span>
    {#if r.phone}<span class="sub"><Phone size={12} /> {r.phone}</span>{/if}
  </div>
{/snippet}
{#snippet vendorCell(r: AdminQuote)}<span>{r.vendor_name ?? `#${r.vendor_id}`}</span>{/snippet}
{#snippet msgCell(r: AdminQuote)}
  <div class="stack">
    <span class="msg" title={r.message}>{excerpt(r.message)}</span>
    {#if r.slot_label}<span class="sub">Créneau : {r.slot_label}</span>{/if}
  </div>
{/snippet}
{#snippet dateCell(r: AdminQuote)}<span class="sub dark">{stamp(r.created_at)}</span>{/snippet}
{#snippet statusCell(r: AdminQuote)}<span class="badge {r.status}">{STATUS[r.status]}</span>{/snippet}
{#snippet rowActions(r: AdminQuote)}
  {#if canManage}
    <Btn class="btn-primary btn-sm" onclick={() => openReply(r)}><Reply size={14} /> {r.status === "answered" ? "Répondre à nouveau" : "Répondre"}</Btn>
  {:else}
    <Btn class="btn-outline btn-sm" onclick={() => openReply(r)}><Eye size={14} /> Voir</Btn>
  {/if}
{/snippet}

<div class="page">
  <p class="desc">Demandes de devis envoyées depuis les profils prestataires pour le pays sélectionné. Chaque nouvelle demande est signalée par e-mail à l'administration ; votre réponse part par e-mail au demandeur.</p>

  <div class="toolbar">
    <div class="tabs" role="tablist">
      {#each TABS as t (t.key)}
        <button role="tab" aria-selected={status === t.key} class:active={status === t.key} onclick={() => { status = t.key; refilter(); }}>
          {t.label}{#if data}<span class="n">{data.counts[t.key as keyof typeof data.counts]}</span>{/if}
        </button>
      {/each}
    </div>
    <label class="search"><Search size={15} /><input type="search" placeholder="Nom, e-mail, téléphone, prestataire, message…" bind:value={q} oninput={onSearch} /></label>
  </div>

  <DataTable
    {columns}
    rows={data?.items ?? []}
    rowKey={(r) => r.id}
    {loading}
    {page}
    pageSize={PAGE_SIZE}
    total={data?.total ?? 0}
    itemLabel="devis"
    emptyTitle="Aucun devis"
    emptyText="Les demandes de devis apparaîtront ici dès qu'un visiteur en enverra une."
    onpage={go}
    onrowclick={openReply}
    actions={rowActions}
  />
</div>

<Modal open={target !== null} title={target ? `Devis #${target.id}` : ""} subtitle={target ? `Reçu le ${stamp(target.created_at)}` : ""} width="40rem" locked={sending} onclose={() => (target = null)}>
  {#if target}
    <form id="reply-form" class="rep" onsubmit={send}>
      <dl>
        <dt>Demandeur</dt><dd>{target.name}{#if target.client_id} <span class="tag">Compte client</span>{/if}</dd>
        <dt>E-mail</dt><dd><a href={`mailto:${target.email}`}>{target.email}</a></dd>
        {#if target.phone}<dt>Téléphone</dt><dd><a href={`tel:${target.phone}`}>{target.phone}</a></dd>{/if}
        <dt>Prestataire</dt><dd>{target.vendor_name ?? `#${target.vendor_id}`}</dd>
        {#if target.slot_label}<dt>Créneau</dt><dd>{target.slot_label}</dd>{/if}
        <dt>Demande</dt><dd class="pre">{target.message}</dd>
      </dl>

      {#if target.status === "answered" && target.reply_message}
        <div class="prev">
          <strong>Dernière réponse</strong> · {stamp(target.replied_at)}{target.replied_by ? ` · ${target.replied_by}` : ""}
          <p class="pre">{target.reply_message}</p>
        </div>
      {/if}

      {#if canManage}
        <label>Objet de l'e-mail
          <input type="text" bind:value={subject} required minlength="3" maxlength="200" />
        </label>
        <label>Votre réponse
          <textarea rows="7" bind:value={message} required minlength="3" maxlength="5000" placeholder="Rédigez la réponse qui sera envoyée par e-mail au demandeur…"></textarea>
        </label>
        <p class="hint">La réponse sera envoyée à <strong>{target.email}</strong> en {target.lang === "en" ? "anglais" : "français"}.</p>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn class="btn-outline" disabled={sending} onclick={() => (target = null)}>{canManage ? "Annuler" : "Fermer"}</Btn>
    {#if canManage}<Btn type="submit" form="reply-form" class="btn-primary" loading={sending}>Envoyer la réponse</Btn>{/if}
  {/snippet}
</Modal>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; max-width: 52rem; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; overflow-x: auto; max-width: 100%; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
  .n { background: #e5e7eb; border-radius: 999px; padding: 0 0.45rem; font-size: 0.7rem; }
  .search { display: flex; align-items: center; gap: 0.4rem; flex: 1 1 18rem; max-width: 26rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; }
  .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .search:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .stack { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .ref { font-size: 0.78rem; font-weight: 800; color: #2563eb; letter-spacing: 0.03em; }
  .sub { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: #6b7280; }
  .sub.dark { color: #374151; }
  .msg { color: #111827; line-height: 1.35; }
  .tag { margin-left: 0.4rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: #e0e7ff; color: #3730a3; font-size: 0.66rem; font-weight: 700; vertical-align: middle; }
  .badge { display: inline-block; padding: 0.18rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .badge.new { background: #fef3c7; color: #92400e; }
  .badge.answered { background: #d1fae5; color: #065f46; }
  .rep { display: flex; flex-direction: column; gap: 0.9rem; }
  dl { display: grid; grid-template-columns: 7.5rem 1fr; gap: 0.5rem 1rem; margin: 0; }
  dt { color: #6b7280; font-size: 0.8rem; }
  dd { margin: 0; color: #111827; font-size: 0.9rem; overflow-wrap: anywhere; }
  dd a { color: #2563eb; text-decoration: none; }
  .pre { white-space: pre-wrap; }
  .prev { padding: 0.75rem 0.9rem; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 0.82rem; color: #065f46; }
  .prev p { margin: 0.35rem 0 0; color: #14532d; font-size: 0.88rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; color: #374151; }
  input[type="text"], textarea { padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-weight: 400; font-size: 0.9rem; }
  input[type="text"]:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .hint { margin: 0; font-size: 0.78rem; color: #6b7280; }
  @media (max-width: 720px) {
    dl { grid-template-columns: 1fr; gap: 0.1rem; }
    dt { margin-top: 0.5rem; }
  }
</style>
