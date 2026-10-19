<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import Search from "@lucide/svelte/icons/search";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import PenLine from "@lucide/svelte/icons/pen-line";
  import { listForms, type FormList } from "$lib/api/enrollmentForms";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const TABS = [["all", "Tous"], ["pending", "En attente"], ["approved", "Approuvés"], ["rejected", "Refusés"]] as const;
  const STATUS = { pending: "En attente", approved: "Approuvé", rejected: "Refusé" } as const;

  let data = $state<FormList | null>(null);
  let loading = $state(true);
  let status = $state("pending");
  let q = $state("");
  let page = $state(1);
  const pages = $derived(data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);

  let seq = 0;
  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const r = await listForms({ status, q: q.trim(), page, page_size: 20 });
      if (mine === seq) data = r;
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
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
</script>

<div class="pg">
  <p class="desc">Dossiers soumis par les prestataires. Ouvrez un dossier pour vérifier chaque information, puis approuvez ou refusez.</p>
  <div class="toolbar">
    <div class="tabs" role="tablist">
      {#each TABS as [k, l] (k)}
        <button role="tab" aria-selected={status === k} class:active={status === k} onclick={() => { status = k; refilter(); }}>{l}{#if data}<span class="n">{data.counts[k]}</span>{/if}</button>
      {/each}
    </div>
    <label class="search"><Search size={15} /><input type="search" placeholder="Nom, téléphone, e-mail…" bind:value={q} oninput={onSearch} /></label>
  </div>

  {#if loading && !data}
    <div class="state">Chargement…</div>
  {:else if data && data.items.length === 0}
    <div class="state"><ClipboardCheck size={28} /><p>Aucun dossier ne correspond.</p></div>
  {:else if data}
    <div class="list" class:dim={loading}>
      {#each data.items as r (r.id)}
        <button class="row" onclick={() => goto(`/admin/enrolements/${r.id}`)}>
          <span class="av">{#if r.image}<img src={r.image} alt="" />{:else}{initials(r.name)}{/if}</span>
          <div class="who"><strong>{r.name || "Prestataire"}</strong><span class="sub">{r.phone ?? "—"}{r.email ? ` · ${r.email}` : ""}</span></div>
          <div class="mid"><span>{r.company ? `Entreprise · ${r.company}` : "Particulier"}</span><span class="sub">{r.study_level ?? "—"}{r.city ? ` · ${r.city}` : ""}</span></div>
          <div class="end">
            <span class="badge {r.status}">{STATUS[r.status]}</span>
            {#if r.signature_pending}<span class="sig"><PenLine size={12} /> Signature à valider</span>{/if}
            <span class="sub">{when(r.updated_at)}</span>
          </div>
        </button>
      {/each}
    </div>
    {#if pages > 1}
      <div class="pager">
        <button onclick={() => { page -= 1; load(); }} disabled={page <= 1 || loading} aria-label="Page précédente"><ChevronLeft size={16} /></button>
        <span>Page {page} / {pages} · {data.total} dossiers</span>
        <button onclick={() => { page += 1; load(); }} disabled={page >= pages || loading} aria-label="Page suivante"><ChevronRight size={16} /></button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .pg { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; }
  .toolbar { display: flex; gap: 0.8rem; flex-wrap: wrap; align-items: center; justify-content: space-between; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; overflow-x: auto; max-width: 100%; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
  .n { background: #e5e7eb; border-radius: 999px; padding: 0 0.45rem; font-size: 0.7rem; }
  .search { display: flex; align-items: center; gap: 0.4rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; min-width: 16rem; }
  .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3rem 1rem; color: #9ca3af; }
  .list { display: flex; flex-direction: column; gap: 0.6rem; transition: opacity 0.15s; }
  .list.dim { opacity: 0.55; }
  .row { display: grid; grid-template-columns: auto 1.4fr 1.2fr auto; gap: 1rem; align-items: center; text-align: left; padding: 0.8rem 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; font: inherit; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
  .row:hover { border-color: #93c5fd; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
  .av { width: 2.6rem; height: 2.6rem; border-radius: 50%; background: #04330d; color: #ffc72c; display: grid; place-items: center; font-weight: 800; font-size: 0.85rem; overflow: hidden; }
  .av img { width: 100%; height: 100%; object-fit: cover; }
  .who, .mid, .end { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .end { align-items: flex-end; }
  .sub { font-size: 0.78rem; color: #6b7280; overflow-wrap: anywhere; }
  .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; width: fit-content; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.approved { background: #d1fae5; color: #065f46; }
  .badge.rejected { background: #fee2e2; color: #991b1b; }
  .sig { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 700; color: #7c3aed; }
  .pager { display: flex; justify-content: center; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #6b7280; }
  .pager button { display: inline-flex; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; cursor: pointer; }
  .pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  @media (max-width: 760px) { .row { grid-template-columns: auto 1fr; } .mid { grid-column: 1 / -1; } .end { grid-column: 1 / -1; align-items: flex-start; flex-direction: row; flex-wrap: wrap; gap: 0.6rem; } }
</style>
