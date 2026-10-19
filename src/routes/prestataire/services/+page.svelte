<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Copy from "@lucide/svelte/icons/copy";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import { goto } from "$app/navigation";
  import { deleteMyService, duplicateMyService, listMyServices, setMyServiceVisibility, type ServiceCard } from "$lib/api/providerServices";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let items = $state<ServiceCard[]>([]);
  let limit = $state(50);
  let loading = $state(true);
  let q = $state("");
  let filter = $state<"all" | "on" | "off">("all");

  async function load() {
    try {
      const r = await listMyServices(i18n.locale);
      items = r.items;
      limit = r.limit;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const shown = $derived.by(() => {
    const t = norm(q.trim());
    return items.filter((s) => (filter === "all" || (filter === "on") === s.is_active) && (!t || norm(`${s.title} ${s.subcategory.name ?? ""} ${s.category ?? ""} ${s.city ?? ""}`).includes(t)));
  });
  const active = $derived(items.filter((s) => s.is_active).length);
  const bookings = $derived(items.reduce((n, s) => n + s.stats.bookings, 0));
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  async function toggle(s: ServiceCard) {
    const next = !s.is_active;
    s.is_active = next; // optimiste
    try {
      await setMyServiceVisibility(s.id, next);
      snackbar.success(next ? "Service visible par les clients." : "Service masqué.");
    } catch (e) {
      s.is_active = !next;
      snackbar.error((e as Error).message);
    }
  }
  async function copy(s: ServiceCard) {
    try {
      const r = await duplicateMyService(s.id);
      snackbar.success("Copie créée (masquée). Ajustez-la puis publiez-la.");
      goto(`/prestataire/services/${r.id}`);
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
  async function remove(s: ServiceCard) {
    const used = s.stats.bookings > 0;
    await confirmDialog.ask({
      title: "Supprimer ce service ?",
      message: used ? `« ${s.title} » a déjà ${s.stats.bookings} réservation(s) : il sera retiré de votre fiche, l'historique est conservé.` : `« ${s.title} » sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await deleteMyService(s.id);
        items = items.filter((x) => x.id !== s.id);
        snackbar.success("Service supprimé.");
      },
    });
  }
</script>

<div class="pw">
  <div class="pw-top">
    <div><h1>Mes services</h1><p class="pw-sub">Ce que les clients peuvent réserver chez vous. Chaque service apparaît sur votre fiche et dans la recherche.</p></div>
    <a class="btn btn-primary" href="/prestataire/services/nouveau"><Plus size={16} /> Nouveau service</a>
  </div>

  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else if items.length === 0}
    <div class="pw-box empty">
      <Briefcase size={34} />
      <h2>Créez votre premier service</h2>
      <p class="pw-muted">Choisissez votre métier, fixez vos tarifs et vos quartiers : vous serez visible des clients tout de suite.</p>
      <a class="btn btn-primary" href="/prestataire/services/nouveau"><Plus size={16} /> Créer un service</a>
    </div>
  {:else}
    <div class="pw-kpis three">
      <div class="pw-kpi"><small>Services</small><strong>{items.length}<span> / {limit}</span></strong></div>
      <div class="pw-kpi"><small>Visibles</small><strong>{active}</strong></div>
      <div class="pw-kpi"><small>Réservations</small><strong>{bookings}</strong></div>
    </div>

    <div class="bar">
      <label class="pw-search"><Search size={15} /><input type="search" placeholder="Rechercher un service…" bind:value={q} /></label>
      <div class="pw-tabs">
        <button class:on={filter === "all"} onclick={() => (filter = "all")}>Tous <span class="pw-n">{items.length}</span></button>
        <button class:on={filter === "on"} onclick={() => (filter = "on")}>Visibles <span class="pw-n">{active}</span></button>
        <button class:on={filter === "off"} onclick={() => (filter = "off")}>Masqués <span class="pw-n">{items.length - active}</span></button>
      </div>
    </div>

    <div class="grid">
      {#each shown as s (s.id)}
        <article class="card" class:off={!s.is_active}>
          <a class="ph" href={`/prestataire/services/${s.id}`} aria-label={`Modifier ${s.title}`}>
            {#if s.image}<img src={s.image} alt="" loading="lazy" />{:else}<span>{(s.subcategory.name ?? s.title).slice(0, 2)}</span>{/if}
            <em class="pw-badge" class:completed={s.is_active} class:cancelled={!s.is_active}>{s.is_active ? "Visible" : "Masqué"}</em>
          </a>
          <div class="bd">
            <span class="cat">{s.subcategory.name ?? s.category}</span>
            <h3><a href={`/prestataire/services/${s.id}`}>{s.title}</a></h3>
            <p class="price">À partir de <strong>{fmt(s.min_price)} FCFA</strong>{#if s.units.length > 1}<span> · {s.units.length} tarifs</span>{/if}</p>
            <p class="pw-sm place"><MapPin size={13} />{s.type === "online" ? "À distance" : `${s.city ?? "—"} · ${s.districts.length} quartier(s)`}</p>
            <p class="pw-sm">{s.stats.bookings} réservation(s) · {s.stats.completed} terminée(s){#if s.stats.revenue} · {fmt(s.stats.revenue)} FCFA{/if}</p>
          </div>
          <div class="ft">
            <label class="sw" title={s.is_active ? "Masquer" : "Afficher"}><input type="checkbox" checked={s.is_active} onchange={() => toggle(s)} /><span>{s.is_active ? "Visible" : "Masqué"}</span></label>
            <span class="act">
              <a class="ico" href={`/prestataire/services/${s.id}`} aria-label="Modifier"><Pencil size={16} /></a>
              <button class="ico" aria-label="Dupliquer" onclick={() => copy(s)}><Copy size={16} /></button>
              <button class="ico danger" aria-label="Supprimer" onclick={() => remove(s)}><Trash2 size={16} /></button>
            </span>
          </div>
        </article>
      {:else}<div class="pw-empty">Aucun service ne correspond.</div>{/each}
    </div>
  {/if}
</div>

<style>
  .pw-kpis.three { grid-template-columns: repeat(3, 1fr); } .pw-kpi strong span { font-size: 0.9rem; color: #9ca3af; font-weight: 600; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 1rem; }
  .card { background: #fff; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #eceef2; transition: box-shadow 0.15s; }
  .card:hover { box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08); } .card.off .ph { filter: grayscale(0.85); opacity: 0.8; }
  .ph { position: relative; display: block; aspect-ratio: 16 / 9; background: #e8f5ec; } .ph img { width: 100%; height: 100%; object-fit: cover; }
  .ph > span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem; font-weight: 800; color: #0f7d41; text-transform: uppercase; }
  .ph .pw-badge { position: absolute; top: 0.6rem; left: 0.6rem; font-style: normal; }
  .bd { padding: 0.9rem 1rem 0.4rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; } .bd p { margin: 0; }
  .cat { font-size: 0.72rem; font-weight: 800; color: #0f7d41; text-transform: uppercase; letter-spacing: 0.04em; }
  h3 { margin: 0; font-size: 1.02rem; } h3 a { color: #1d2230; text-decoration: none; } h3 a:hover { text-decoration: underline; }
  .price { font-size: 0.88rem; color: #374151; } .price span { color: #6b7280; } .place { display: flex; align-items: center; gap: 0.3rem; }
  .ft { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem 0.8rem; border-top: 1px solid #f1f2f5; margin-top: 0.5rem; }
  .sw { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; } .sw input { accent-color: #0f7d41; width: 1.05rem; height: 1.05rem; }
  .act { display: inline-flex; gap: 0.2rem; }
  .ico { display: inline-flex; padding: 0.4rem; border: none; background: none; border-radius: 8px; color: #6b7280; cursor: pointer; } .ico:hover { background: #f3f4f6; color: #111827; } .ico.danger:hover { background: #fee2e2; color: #b91c1c; }
  .empty { align-items: center; text-align: center; padding: 3rem 1.5rem; color: #6b7280; } .empty h2 { color: #1d2230; }
  @media (max-width: 640px) { .pw-kpis.three { grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; } }
</style>
