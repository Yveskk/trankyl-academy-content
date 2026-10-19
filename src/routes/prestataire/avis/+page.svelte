<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Star from "@lucide/svelte/icons/star";
  import { getMyReviews, replyReview, type WorkReview } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const pending = new Pending();
  let items = $state<WorkReview[]>([]);
  let avg = $state<number | null>(null);
  let count = $state(0);
  let loading = $state(true);
  let drafts = $state<Record<number, string>>({});

  async function load() {
    try {
      const r = await getMyReviews();
      items = r.items;
      avg = r.average;
      count = r.count;
      drafts = Object.fromEntries(r.items.map((i) => [i.id, i.reply ?? ""]));
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(load);
  async function send(r: WorkReview) {
    await pending.run(`r${r.id}`, async () => {
      try {
        await replyReview(r.id, drafts[r.id] ?? "");
        snackbar.success(drafts[r.id]?.trim() ? "Réponse publiée." : "Réponse retirée.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Avis</h1><p class="pw-sub">Ce que disent vos clients. Votre réponse est visible sous l'avis, sur votre fiche.</p></div>
    {#if avg !== null}<div class="pw-kpi"><small>Note moyenne</small><strong>{avg} / 5</strong><small>{count} avis publié(s)</small></div>{/if}</div>
  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else if items.length === 0}<div class="pw-empty">Aucun avis pour le moment.</div>
  {:else}
    {#each items as r (r.id)}
      <article class="pw-box">
        <div class="h"><span class="st">{#each Array(5) as _, i}<Star size={15} fill={i < r.rating ? "#f5b301" : "none"} color={i < r.rating ? "#f5b301" : "#c4c8d0"} />{/each}</span><strong>{r.client ?? "Client"}</strong><span class="pw-sm">{date(r.created_at)}</span>{#if r.status === "pending"}<span class="pw-badge pending">En modération</span>{/if}</div>
        {#if r.comment}<p>« {r.comment} »</p>{/if}
        {#if r.status === "approved"}
          <textarea rows="2" maxlength="1000" placeholder="Répondre à cet avis…" bind:value={drafts[r.id]}></textarea>
          <div><Btn class="btn-outline btn-sm" loading={pending.is(`r${r.id}`)} disabled={(drafts[r.id] ?? "") === (r.reply ?? "")} onclick={() => send(r)}>{r.reply ? "Modifier la réponse" : "Publier la réponse"}</Btn></div>
        {:else}<p class="pw-muted">Vous pourrez répondre une fois l'avis approuvé par l'équipe.</p>{/if}
      </article>
    {/each}
  {/if}
</div>

<style>
  .h { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .st { display: inline-flex; gap: 0.1rem; }
  article p { margin: 0; }
</style>
