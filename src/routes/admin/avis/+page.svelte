<script lang="ts">
  import { onMount } from "svelte";
  import { adminImportBookingMarks, adminListReviews, adminModerateReview, type AdminReview } from "$lib/api/reviews";
  import Btn from "$lib/components/Btn.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import Download from "@lucide/svelte/icons/download";

  const TABS = [
    { key: "pending", label: "En attente" },
    { key: "approved", label: "Approuvés" },
    { key: "rejected", label: "Refusés" },
    { key: "", label: "Tous" },
  ];
  const SOURCES: Record<string, string> = { academy: "Academy", booking_mark: "Réservation", admin: "Admin" };

  let tab = $state("pending");
  let reviews = $state<AdminReview[]>([]);
  let replies = $state<Record<number, string>>({});
  let loading = $state(true);
  const pending = new Pending();

  async function refresh() {
    loading = true;
    try {
      reviews = await adminListReviews(tab || undefined);
      replies = Object.fromEntries(reviews.map((r) => [r.id, r.reply ?? ""]));
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  onMount(refresh);

  async function setStatus(r: AdminReview, status: AdminReview["status"]) {
    await pending.run(`status:${r.id}`, async () => {
      try {
        await adminModerateReview(r.id, { status });
        snackbar.success(status === "approved" ? "Avis approuvé : il est visible sur le site." : status === "rejected" ? "Avis refusé." : "Avis mis en attente.");
        await refresh();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function reject(r: AdminReview) {
    const ok = await confirmDialog.ask({
      title: "Refuser cet avis ?",
      message: r.status === "approved" ? "Il ne sera plus affiché sur le site et ne comptera plus dans le score de confiance." : "Il ne sera pas affiché sur le site.",
      confirmLabel: "Refuser l'avis",
      tone: "danger",
    });
    if (ok) await setStatus(r, "rejected");
  }

  async function saveReply(r: AdminReview) {
    await pending.run(`reply:${r.id}`, async () => {
      try {
        await adminModerateReview(r.id, { reply: replies[r.id] ?? "" });
        snackbar.success(replies[r.id]?.trim() ? "Réponse enregistrée." : "Réponse supprimée.");
        await refresh();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function importMarks() {
    await pending.run("import", async () => {
      try {
        const res = await adminImportBookingMarks();
        snackbar.success(`${res.imported} note(s) importée(s) en attente de modération (${res.skipped_existing} déjà importées, ${res.skipped_invalid} ignorées).`);
        tab = "pending";
        await refresh();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
</script>

<div class="reviews">
  <div class="intro">
    <p>
      Seuls les avis <strong>approuvés</strong> sont affichés sur le site et comptent dans le score de confiance. Importez les notes laissées sur les
      réservations pour les modérer ; l'import peut être relancé sans créer de doublon.
    </p>
    <Btn class="btn-outline btn-sm" loading={pending.is("import")} onclick={importMarks}><Download size={14} /> Importer les notes des réservations</Btn>
  </div>

  <div class="tabs">
    {#each TABS as t}
      <button type="button" class:active={tab === t.key} onclick={() => { tab = t.key; refresh(); }}>{t.label}</button>
    {/each}
  </div>

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if reviews.length === 0}
    <p class="empty">Aucun avis dans cette catégorie.</p>
  {:else}
    {#each reviews as r (r.id)}
      <article class="card review">
        <div class="head">
          <strong>{r.vendor_name ?? `Prestataire #${r.vendor_id}`}</strong>
          <span class="stars" aria-label="{r.rating}/5">{"★".repeat(r.rating)}<span class="dim">{"★".repeat(5 - r.rating)}</span></span>
          <span class="tag">{SOURCES[r.source] ?? r.source}</span>
          <span class="tag status {r.status}">{r.status === "approved" ? "Approuvé" : r.status === "pending" ? "En attente" : "Refusé"}</span>
          <span class="muted">{r.client_firstname} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
        <p class="comment">{r.comment || "(sans commentaire)"}</p>
        <div class="reply">
          <textarea rows="2" placeholder="Réponse du prestataire (optionnelle)" bind:value={replies[r.id]}></textarea>
          <Btn class="btn-ghost btn-sm" loading={pending.is(`reply:${r.id}`)} onclick={() => saveReply(r)}>Enregistrer la réponse</Btn>
        </div>
        <div class="actions">
          {#if r.status !== "approved"}<Btn class="btn-primary btn-sm" loading={pending.is(`status:${r.id}`)} onclick={() => setStatus(r, "approved")}><Check size={14} /> Approuver</Btn>{/if}
          {#if r.status !== "rejected"}<Btn class="btn-outline btn-sm" disabled={pending.is(`status:${r.id}`)} onclick={() => reject(r)}><X size={14} /> Refuser</Btn>{/if}
        </div>
      </article>
    {/each}
  {/if}
</div>

<style>
  .reviews {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .intro {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }
  .intro p {
    margin: 0;
    max-width: 52rem;
    color: var(--ink-soft);
  }
  .tabs {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .tabs button {
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .tabs button.active {
    background: var(--green-deep);
    border-color: var(--green-deep);
    color: #fff;
  }
  .review {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
  }
  .stars {
    color: #b07d00;
    letter-spacing: 0.08em;
  }
  .dim {
    color: #d8d3c0;
  }
  .tag {
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.68rem;
    font-weight: 700;
    background: #ececef;
  }
  .status.approved {
    background: #e2f3e8;
    color: var(--green-deep);
  }
  .status.pending {
    background: #ffe9a8;
    color: #6b4f00;
  }
  .status.rejected {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .muted {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .comment {
    margin: 0;
  }
  .reply {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .reply textarea {
    flex: 1;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .empty {
    color: var(--muted);
  }
  @media (max-width: 720px) {
    .intro,
    .reply {
      flex-direction: column;
    }
    .reply textarea {
      width: 100%;
    }
  }
</style>
