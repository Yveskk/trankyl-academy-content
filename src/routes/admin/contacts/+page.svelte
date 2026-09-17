<script lang="ts">
  import { onMount } from "svelte";
  import { adminListContactRequests, reviewContactRequest } from "$lib/api/contactRequests";
  import type { ContactRequestAdmin } from "$lib/api/types";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import Clock from "@lucide/svelte/icons/clock";
  import Phone from "@lucide/svelte/icons/phone";
  import Mail from "@lucide/svelte/icons/mail";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import Award from "@lucide/svelte/icons/award";
  import Gauge from "@lucide/svelte/icons/gauge";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import AlertTriangle from "@lucide/svelte/icons/triangle-alert";

  let requests = $state<ContactRequestAdmin[]>([]);
  let loading = $state(true);
  let filter = $state<"pending" | "all">("pending");
  let reviewingId = $state<number | null>(null);

  async function refresh() {
    loading = true;
    try {
      requests = await adminListContactRequests();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    refresh();
  });

  let filteredRequests = $derived(filter === "pending" ? requests.filter((r) => r.status === "pending") : requests);
  let pendingCount = $derived(requests.filter((r) => r.status === "pending").length);

  async function handleReview(id: number, status: "approved" | "rejected") {
    reviewingId = id;
    try {
      await reviewContactRequest(id, status);
      snackbar.success(status === "approved" ? "Demande approuvée — la messagerie est ouverte." : "Demande rejetée.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      reviewingId = null;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatDateShort(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
</script>

<div class="contacts-page">
  <div class="page-header">
    <p class="header-desc">Demandes de mise en relation client → prestataire. Une messagerie ne s'ouvre qu'après votre validation.</p>
    <div class="filter-tabs">
      <button class:active={filter === "pending"} onclick={() => (filter = "pending")}>
        En attente {#if pendingCount > 0}<span class="count-badge">{pendingCount}</span>{/if}
      </button>
      <button class:active={filter === "all"} onclick={() => (filter = "all")}>Toutes</button>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if filteredRequests.length === 0}
    <div class="empty-state">
      <MessagesSquare size={28} class="empty-icon" />
      <p>{filter === "pending" ? "Aucune demande en attente." : "Aucune demande de contact."}</p>
    </div>
  {:else}
    <div class="requests-list">
      {#each filteredRequests as req}
        <div class="request-card">
          <div class="request-parties">
            <div class="party">
              <span class="party-label">Client</span>
              <span class="party-name">{req.client_nom}</span>
              <span class="party-detail"><Mail size={11} />{req.client_email}</span>
              {#if req.client_phone}<span class="party-detail"><Phone size={11} />{req.client_phone}</span>{/if}
              <span class="party-detail"><CalendarDays size={11} />Inscrit le {formatDateShort(req.client_created_at)}</span>
              <span class="party-detail" class:warn={req.client_total_requests > 1}>
                {#if req.client_total_requests > 1}<AlertTriangle size={11} />{/if}
                {req.client_total_requests} demande{req.client_total_requests > 1 ? "s" : ""} au total
              </span>
            </div>

            <span class="arrow">→</span>

            <div class="party">
              <span class="party-label">Prestataire</span>
              <span class="party-name">{req.prestataire_nom}</span>
              <span class="party-detail"><Mail size={11} />{req.prestataire_email}</span>
              {#if req.prestataire_phone}<span class="party-detail"><Phone size={11} />{req.prestataire_phone}</span>{/if}
              <span class="party-detail"><CalendarDays size={11} />Inscrit le {formatDateShort(req.prestataire_created_at)}</span>
              <span class="party-detail" class:ok={req.prestataire_is_verified} class:warn={!req.prestataire_is_verified}>
                {#if req.prestataire_is_verified}<ShieldCheck size={11} />Identité vérifiée{:else}<ShieldAlert size={11} />Non vérifié{/if}
              </span>
              <span class="party-detail" class:warn={req.prestataire_trust_score !== null && req.prestataire_trust_score < 50}>
                <Gauge size={11} />
                Confiance : {req.prestataire_trust_score !== null ? `${req.prestataire_trust_score}/100` : "non calculée"}
              </span>
              {#if req.prestataire_certifications.length > 0}
                <span class="party-certs">
                  <Award size={11} />
                  {#each req.prestataire_certifications as code}<span class="cert-chip">{code}</span>{/each}
                </span>
              {:else}
                <span class="party-detail warn"><Award size={11} />Aucune certification</span>
              {/if}
            </div>
          </div>

          {#if req.initial_message}
            <p class="request-message">« {req.initial_message} »</p>
          {/if}

          <div class="request-meta-row">
            <span class="request-date"><Clock size={12} />Demande créée le {formatDate(req.created_at)}</span>
            {#if req.reviewed_at}
              <span class="request-date"><Clock size={12} />Traitée le {formatDate(req.reviewed_at)}</span>
            {/if}
            {#if req.status === "approved"}
              <span class="request-date">
                <MessagesSquare size={12} />
                {req.message_count} message{req.message_count > 1 ? "s" : ""} échangé{req.message_count > 1 ? "s" : ""}
                {#if req.last_message_at} · dernier le {formatDate(req.last_message_at)}{/if}
              </span>
            {/if}
          </div>

          <div class="request-footer">
            {#if req.status === "pending"}
              <div class="request-actions">
                <button class="btn-approve" onclick={() => handleReview(req.id, "approved")} disabled={reviewingId === req.id}>
                  <Check size={14} /> Approuver
                </button>
                <button class="btn-reject" onclick={() => handleReview(req.id, "rejected")} disabled={reviewingId === req.id}>
                  <X size={14} /> Rejeter
                </button>
              </div>
            {:else}
              <span class="status-pill" class:approved={req.status === "approved"} class:rejected={req.status === "rejected"}>
                {req.status === "approved" ? "Approuvée" : "Rejetée"}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .contacts-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; max-width: 480px; }

  .filter-tabs { display: flex; gap: 0.4rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; }
  .filter-tabs button { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font-family: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
  .filter-tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .count-badge { background: #dc2626; color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; }

  .loading-state, .empty-state { text-align: center; padding: 3rem; color: #6b7280; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
  :global(.empty-icon) { color: #d1d5db; margin-bottom: 0.5rem; }

  .requests-list { display: flex; flex-direction: column; gap: 0.85rem; }
  .request-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }

  .request-parties { display: flex; align-items: flex-start; gap: 1.25rem; flex-wrap: wrap; }
  .party { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 220px; }
  .party-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 0.1rem; }
  .party-name { font-size: 0.9rem; font-weight: 700; color: #111827; margin-bottom: 0.15rem; }
  .party-detail { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #6b7280; }
  .party-detail.ok { color: #047857; font-weight: 600; }
  .party-detail.warn { color: #b45309; font-weight: 600; }
  .party-certs { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; font-size: 0.75rem; color: #6b7280; margin-top: 0.15rem; }
  .cert-chip { background: #ecfdf5; color: #047857; font-weight: 700; font-size: 0.68rem; padding: 0.15rem 0.5rem; border-radius: 999px; }
  .arrow { color: #d1d5db; font-size: 1.1rem; align-self: center; }

  .request-message { margin: 0.75rem 0 0; padding: 0.65rem 0.85rem; background: #f9fafb; border-radius: 8px; font-size: 0.85rem; color: #374151; font-style: italic; }

  .request-meta-row { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid #f3f4f6; }

  .request-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 0.6rem; flex-wrap: wrap; gap: 0.6rem; }
  .request-date { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #9ca3af; }

  .request-actions { display: flex; gap: 0.5rem; }
  .btn-approve, .btn-reject { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; border-radius: 8px; font-family: inherit; font-weight: 700; font-size: 0.78rem; cursor: pointer; border: none; }
  .btn-approve { background: #ecfdf5; color: #047857; }
  .btn-approve:hover { background: #03a71a; color: #fff; }
  .btn-reject { background: #fef2f2; color: #dc2626; }
  .btn-reject:hover { background: #dc2626; color: #fff; }
  .btn-approve:disabled, .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

  .status-pill { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
  .status-pill.approved { background: #ecfdf5; color: #047857; }
  .status-pill.rejected { background: #fef2f2; color: #dc2626; }
</style>
