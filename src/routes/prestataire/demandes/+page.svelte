<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Search from "@lucide/svelte/icons/search";
  import Phone from "@lucide/svelte/icons/phone";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { listRequests, setRequestStatus, type RequestList, type WorkRequest } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const TABS = [["all", "Toutes"], ["pending", "En attente"], ["completed", "Terminées"], ["cancelled", "Annulées"]] as const;
  const LABEL = { pending: "En attente", completed: "Terminée", cancelled: "Annulée" } as const;
  let data = $state<RequestList | null>(null);
  let loading = $state(true);
  let status = $state("all");
  let q = $state("");
  let page = $state(1);
  let sel = $state<WorkRequest | null>(null);
  let reason = $state("");
  const pages = $derived(data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);

  let seq = 0;
  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const r = await listRequests({ status, q: q.trim(), page });
      if (mine === seq) {
        data = r;
        providerSpace.newRequests = r.counts.pending;
      }
    } catch (e) {
      if (mine === seq) snackbar.error((e as Error).message);
    } finally {
      if (mine === seq) loading = false;
    }
  }
  onMount(load);
  const refilter = () => ((page = 1), load());
  let timer: ReturnType<typeof setTimeout>;
  const onSearch = () => (clearTimeout(timer), (timer = setTimeout(refilter, 350)));
  const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
  const when = (d: string | null, t: string | null) => (d ? `${new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}${t ? ` · ${t}` : ""}` : "—");

  async function change(next: "completed" | "cancelled") {
    if (!sel) return;
    const r = sel;
    if (next === "cancelled" && !reason.trim()) return void snackbar.error("Indiquez le motif : le client le recevra.");
    const ok = await confirmDialog.ask({
      title: next === "completed" ? "Marquer comme terminée ?" : "Annuler cette demande ?",
      message: next === "completed" ? `La mission ${r.ref} sera comptée dans vos missions réalisées.` : `La demande ${r.ref} sera annulée. Cette action est définitive.`,
      confirmLabel: next === "completed" ? "Terminée" : "Annuler la demande",
      tone: next === "completed" ? "default" : "danger",
      action: () => setRequestStatus(r.id, next, reason.trim()),
    });
    if (!ok) return;
    snackbar.success(next === "completed" ? "Mission terminée." : "Demande annulée.");
    sel = null;
    await load();
  }
</script>

<div class="pw">
  <div><h1>Demandes</h1><p class="pw-sub">Les réservations passées par vos clients. Marquez-les terminées une fois la mission faite.</p></div>
  <div class="pw-top">
    <div class="pw-tabs" role="tablist">
      {#each TABS as [k, l] (k)}<button role="tab" aria-selected={status === k} class:on={status === k} onclick={() => { status = k; refilter(); }}>{l}{#if data}<span class="pw-n">{data.counts[k]}</span>{/if}</button>{/each}
    </div>
    <label class="pw-search"><Search size={15} /><input type="search" placeholder="Réf., client, service…" bind:value={q} oninput={onSearch} /></label>
  </div>

  {#if loading && !data}
    <div class="pw-empty">Chargement…</div>
  {:else if data && data.items.length === 0}
    <div class="pw-empty">Aucune demande pour le moment.</div>
  {:else if data}
    <div class="pw-list" style:opacity={loading ? 0.55 : 1}>
      {#each data.items as r (r.id)}
        <button class="pw-row" onclick={() => { sel = r; reason = ""; }}>
          <div><span class="pw-ref">{r.ref}</span><strong>{r.service ?? "Service"}{r.qty && r.qty > 1 ? ` × ${r.qty}` : ""}</strong><span class="pw-sm">{r.client_name ?? "Client"} · {r.client_phone ?? "—"}</span></div>
          <div><span>{when(r.date, r.time)}</span><span class="pw-sm">{r.address ?? "—"}</span></div>
          <div class="end"><strong>{money(r.total)}</strong><span class="pw-badge {r.status}">{LABEL[r.status]}</span></div>
        </button>
      {/each}
    </div>
    {#if pages > 1}
      <div class="pw-pager"><button onclick={() => { page -= 1; load(); }} disabled={page <= 1 || loading} aria-label="Précédente"><ChevronLeft size={16} /></button><span>Page {page} / {pages}</span><button onclick={() => { page += 1; load(); }} disabled={page >= pages || loading} aria-label="Suivante"><ChevronRight size={16} /></button></div>
    {/if}
  {/if}
</div>

<Modal open={sel !== null} title={sel ? `Demande ${sel.ref}` : ""} width="36rem" onclose={() => (sel = null)}>
  {#if sel}
    <div class="pw"><span class="pw-badge {sel.status}">{LABEL[sel.status]}</span>
      <dl>
        <dt>Service</dt><dd>{sel.service ?? "—"}{sel.qty ? ` × ${sel.qty}` : ""}</dd>
        <dt>Rendez-vous</dt><dd>{when(sel.date, sel.time)}</dd>
        <dt>Client</dt><dd>{sel.client_name ?? "—"}<br />{#if sel.client_phone}<a href={`tel:${sel.client_phone}`}><Phone size={12} /> {sel.client_phone}</a>{/if}</dd>
        <dt>Adresse</dt><dd>{sel.address ?? "—"}{#if sel.map_link}<br /><a href={sel.map_link} target="_blank" rel="noopener noreferrer"><MapPin size={12} /> Voir sur la carte</a>{/if}</dd>
        {#if sel.info}<dt>Précisions</dt><dd>{sel.info}</dd>{/if}
        <dt>Paiement</dt><dd>{sel.payment_method === "online" || sel.payment_method === "ligne" ? "En ligne" : "Espèces"} · {sel.paid ? "payé" : "non payé"}</dd>
        <dt>Montant</dt><dd><strong>{money(sel.total)}</strong></dd>
        {#if sel.cancellation_reason}<dt>Motif d'annulation</dt><dd>{sel.cancellation_reason}</dd>{/if}
      </dl>
      {#if sel.status === "pending"}<label class="pw-muted" for="why">Motif (en cas d'annulation)</label><textarea id="why" rows="2" maxlength="300" bind:value={reason} placeholder="Ex. indisponible à cette date"></textarea>{/if}
    </div>
  {/if}
  {#snippet footer()}
    {#if sel?.status === "pending"}<Btn class="btn-outline btn-danger" onclick={() => change("cancelled")}>Annuler</Btn><Btn class="btn-primary" onclick={() => change("completed")}>Marquer terminée</Btn>{:else}<Btn class="btn-outline" onclick={() => (sel = null)}>Fermer</Btn>{/if}
  {/snippet}
</Modal>
