<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Bell from "@lucide/svelte/icons/bell";
  import { getNotices, type Notice } from "$lib/api/providerAccount";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let items = $state<Notice[]>([]);
  let seen = $state(0);
  let loading = $state(true);
  let open = $state<number | null>(null);

  onMount(async () => {
    try {
      seen = Number(localStorage.getItem("ps_notice_seen") || 0);
      const r = await getNotices(100);
      items = r.items;
      providerSpace.markNoticesSeen(r.latest_id); // les nouveautes restent mises en evidence sur cette page, le badge du menu repart a zero
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });
  const date = (d: string | null) => {
    if (!d) return "";
    const x = new Date(d);
    return isNaN(+x) ? d : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Notifications</h1><p class="pw-sub">Les annonces de Trankyl et les messages qui vous sont adressés.</p></div></div>
  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else if items.length === 0}<div class="pw-box empty"><Bell size={30} /><p class="pw-muted">Aucune notification pour le moment.</p></div>
  {:else}
    <div class="list">
      {#each items as n (n.id)}
        <button class="n" class:new={n.id > seen} class:open={open === n.id} onclick={() => (open = open === n.id ? null : n.id)}>
          <span class="dot"></span>
          <span class="t"><strong>{n.title}</strong>{#if n.personal}<em class="pw-badge new">Pour vous</em>{/if}<small>{date(n.date)}</small></span>
          <span class="b">{n.body}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 0.5rem; }
  .n { display: grid; grid-template-columns: 0.6rem 1fr; gap: 0.2rem 0.8rem; text-align: left; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0.9rem 1rem; font: inherit; cursor: pointer; }
  .n.new { border-color: #0f7d41; background: #f3fbf6; } .n:hover { box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06); }
  .dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: transparent; margin-top: 0.4rem; } .n.new .dot { background: #0f7d41; }
  .t { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; } .t small { color: #9ca3af; margin-left: auto; }
  .b { grid-column: 2; color: #4b5563; font-size: 0.88rem; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }
  .n.open .b { display: block; -webkit-line-clamp: unset; line-clamp: unset; }
  .empty { align-items: center; text-align: center; padding: 3rem; color: #9ca3af; }
</style>
