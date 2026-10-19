<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Search from "@lucide/svelte/icons/search";
  import Plus from "@lucide/svelte/icons/plus";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { createVendor, listVendors, restoreVendor, setVendorActive, type VendorList, type VendorRow, type VendorState } from "$lib/api/adminVendors";
  import { auth } from "$lib/stores/auth.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const TABS: { key: VendorState; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "active", label: "Actifs" },
    { key: "inactive", label: "Désactivés" },
    { key: "deleted", label: "Corbeille" },
  ];
  let canManage = $derived(auth.can("academy.providers.manage"));
  const pending = new Pending();

  let data = $state<VendorList | null>(null);
  let loading = $state(true);
  let tab = $state<VendorState>("all");
  let q = $state("");
  let sub = $state("");
  let verified = $state("");
  let page = $state(1);
  let timer: ReturnType<typeof setTimeout>;
  let seq = 0;

  async function load() {
    const mine = ++seq;
    loading = true;
    try {
      const r = await listVendors({ q: q.trim(), state: tab, subscription: sub, verified, page, page_size: 20 });
      if (mine === seq) data = r;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      if (mine === seq) loading = false;
    }
  }
  onMount(load);
  function refilter() {
    page = 1;
    load();
  }
  function onQuery() {
    clearTimeout(timer);
    timer = setTimeout(refilter, 350);
  }
  const pages = $derived(data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1);
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

  async function toggle(v: VendorRow) {
    await pending.run(`t${v.id}`, async () => {
      try {
        await setVendorActive(v.id, !v.is_active);
        snackbar.success(v.is_active ? "Compte désactivé." : "Compte activé.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function restore(v: VendorRow) {
    await pending.run(`r${v.id}`, async () => {
      try {
        await restoreVendor(v.id);
        snackbar.success("Compte restauré.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  // ---- création
  let creating = $state(false);
  let f = $state({ firstname: "", lastname: "", calling_code: "228", phone: "", email: "", city: "", password: "", academy_status: "provider", verified: false });
  let created = $state<{ id: number; temp: string | null } | null>(null);
  async function create() {
    await pending.run("create", async () => {
      try {
        const r = await createVendor({ firstname: f.firstname.trim(), lastname: f.lastname.trim() || null, calling_code: f.calling_code, phone: f.phone.trim(), email: f.email.trim() || null, city: f.city.trim() || null, password: f.password || undefined, academy_status: f.academy_status, verified: f.verified });
        created = { id: r.id, temp: r.temp_password };
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  function closeCreate() {
    creating = false;
    created = null;
    f = { firstname: "", lastname: "", calling_code: "228", phone: "", email: "", city: "", password: "", academy_status: "provider", verified: false };
  }
</script>

<div class="page">
  <div class="head">
    <p class="desc">Tous les prestataires du pays sélectionné : comptes, services, abonnements et corbeille.</p>
    {#if canManage}<Btn class="btn-primary" onclick={() => (creating = true)}><Plus size={16} /> Nouveau prestataire</Btn>{/if}
  </div>

  <div class="tabs" role="tablist">
    {#each TABS as t (t.key)}
      <button role="tab" aria-selected={tab === t.key} class:active={tab === t.key} onclick={() => { tab = t.key; refilter(); }}>
        {t.label}{#if data}<span class="n">{data.counts[t.key]}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="filters">
    <label class="search"><Search size={15} /><input type="search" placeholder="Nom, téléphone, e-mail, identifiant, code de parrainage…" bind:value={q} oninput={onQuery} /></label>
    <select bind:value={sub} onchange={refilter} aria-label="Abonnement"><option value="">Abonnement : tous</option><option value="yes">Avec abonnement actif</option><option value="no">Sans abonnement</option></select>
    <select bind:value={verified} onchange={refilter} aria-label="Vérification"><option value="">Vérification : tous</option><option value="yes">Vérifiés</option><option value="no">Non vérifiés</option></select>
  </div>

  {#if loading && !data}<div class="state">Chargement…</div>
  {:else if data && data.items.length === 0}<div class="state">Aucun prestataire ne correspond.</div>
  {:else if data}
    <div class="list" class:dim={loading}>
      {#each data.items as v (v.id)}
        <div class="row">
          <button class="main" onclick={() => goto(`/admin/prestataires/${v.id}`)}>
            <span class="av">{#if v.photo}<img src={v.photo} alt="" loading="lazy" />{:else}{v.name.slice(0, 1).toUpperCase()}{/if}</span>
            <span class="who"><strong>{v.name || "—"}{#if v.verified}<BadgeCheck size={14} class="vf" />{/if}</strong><small>{v.unique_id} · {v.phone}{v.email ? ` · ${v.email}` : ""}</small></span>
          </button>
          <div class="mid"><span>{v.city ?? "—"}</span><small>{v.services} service(s){v.referral_code ? ` · parrain ${v.referral_code}` : ""}</small></div>
          <div class="mid">
            {#if v.deleted}<span class="b del">Corbeille</span>{:else}<span class="b" class:ok={v.is_active} class:off={!v.is_active}>{v.is_active ? "Actif" : "Désactivé"}</span>{/if}
            <span class="b" class:sub={v.has_subscription}>{v.has_subscription ? `Abonné · ${date(v.subscription_until)}` : "Sans abonnement"}</span>
          </div>
          <div class="acts">
            <a class="btn btn-outline btn-sm" href={`/admin/prestataires/${v.id}`}>Ouvrir</a>
            {#if canManage && v.deleted}<Btn class="btn-outline btn-sm" loading={pending.is(`r${v.id}`)} onclick={() => restore(v)}>Restaurer</Btn>
            {:else if canManage}<Btn class="btn-outline btn-sm" loading={pending.is(`t${v.id}`)} onclick={() => toggle(v)}>{v.is_active ? "Désactiver" : "Activer"}</Btn>{/if}
          </div>
        </div>
      {/each}
    </div>
    {#if pages > 1}
      <div class="pager">
        <button onclick={() => { page--; load(); }} disabled={page <= 1 || loading} aria-label="Page précédente"><ChevronLeft size={16} /></button>
        <span>Page {page} / {pages} · {data.total} prestataire(s)</span>
        <button onclick={() => { page++; load(); }} disabled={page >= pages || loading} aria-label="Page suivante"><ChevronRight size={16} /></button>
      </div>
    {/if}
  {/if}
</div>

<Modal open={creating} title={created ? "Prestataire créé" : "Nouveau prestataire"} subtitle={created ? "" : "Le prestataire pourra se connecter avec son téléphone et ce mot de passe."} width="34rem" onclose={closeCreate}>
  {#if created}
    <p>Le compte a été créé.</p>
    {#if created.temp}<p class="tmp">Mot de passe provisoire (à transmettre une seule fois) : <code>{created.temp}</code></p>{/if}
  {:else}
    <form class="cf" onsubmit={(e) => { e.preventDefault(); create(); }}>
      <label>Prénom(s) *<input type="text" required minlength="2" maxlength="120" bind:value={f.firstname} /></label>
      <label>Nom<input type="text" maxlength="120" bind:value={f.lastname} /></label>
      <label>Indicatif *<input type="text" required pattern="[0-9]+" maxlength="4" bind:value={f.calling_code} /></label>
      <label>Téléphone *<input type="tel" required minlength="6" maxlength="20" placeholder="90 00 00 00" bind:value={f.phone} /></label>
      <label>E-mail<input type="email" maxlength="255" bind:value={f.email} /></label>
      <label>Ville<input type="text" maxlength="120" bind:value={f.city} /></label>
      <label class="full">Mot de passe <small>(laissez vide pour en générer un)</small><input type="text" minlength="8" maxlength="72" bind:value={f.password} autocomplete="off" /></label>
      <label>Statut Academy<select bind:value={f.academy_status}><option value="provider">Prestataire</option><option value="certified_provider">Prestataire certifié</option><option value="apprentice">Apprenant</option></select></label>
      <label class="ck"><input type="checkbox" bind:checked={f.verified} /> Marquer comme vérifié</label>
      <button type="submit" hidden>Créer</button>
    </form>
  {/if}
  {#snippet footer()}
    {#if created}
      <a class="btn btn-primary" href={`/admin/prestataires/${created.id}`}>Ouvrir la fiche</a><Btn class="btn-outline" onclick={closeCreate}>Fermer</Btn>
    {:else}
      <Btn class="btn-outline" onclick={closeCreate}>Annuler</Btn><Btn class="btn-primary" loading={pending.is("create")} disabled={!f.firstname.trim() || f.phone.trim().length < 6} onclick={create}>Créer le compte</Btn>
    {/if}
  {/snippet}
</Modal>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; } .head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; } .desc { margin: 0; color: #6b7280; font-size: 0.9rem; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; overflow-x: auto; align-self: flex-start; max-width: 100%; }
  .tabs button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); } .n { background: #e5e7eb; border-radius: 999px; padding: 0 0.45rem; font-size: 0.7rem; }
  .filters { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .search { display: flex; align-items: center; gap: 0.4rem; flex: 1 1 18rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; } .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .filters select { padding: 0.5rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; font: inherit; }
  .state { text-align: center; padding: 3rem 1rem; color: #9ca3af; } .list { display: flex; flex-direction: column; gap: 0.5rem; } .list.dim { opacity: 0.55; }
  .row { display: grid; grid-template-columns: 1.6fr 1fr 1.1fr auto; gap: 1rem; align-items: center; padding: 0.7rem 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
  .row:hover { border-color: #93c5fd; } .main { display: flex; align-items: center; gap: 0.8rem; text-align: left; background: none; border: none; font: inherit; cursor: pointer; min-width: 0; padding: 0; }
  .av { flex: none; width: 2.6rem; height: 2.6rem; border-radius: 50%; background: #e5e7eb; color: #4b5563; display: grid; place-items: center; font-weight: 800; overflow: hidden; } .av img { width: 100%; height: 100%; object-fit: cover; }
  .who { display: flex; flex-direction: column; min-width: 0; } .who strong { display: inline-flex; align-items: center; gap: 0.3rem; color: #111827; } :global(.vf) { color: #0f7d41; } .who small, .mid small { color: #6b7280; font-size: 0.76rem; overflow-wrap: anywhere; }
  .mid { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; } .acts { display: flex; gap: 0.4rem; justify-content: flex-end; }
  .b { display: inline-block; padding: 0.12rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; width: fit-content; background: #f3f4f6; color: #4b5563; } .b.ok { background: #d1fae5; color: #065f46; } .b.off { background: #fef3c7; color: #92400e; } .b.del { background: #fee2e2; color: #991b1b; } .b.sub { background: #dbeafe; color: #1e40af; }
  .pager { display: flex; justify-content: center; align-items: center; gap: 0.8rem; font-size: 0.85rem; color: #6b7280; } .pager button { display: inline-flex; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; cursor: pointer; } .pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  .cf { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; } .cf label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; color: #374151; font-weight: 600; } .cf .full { grid-column: 1 / -1; } .cf .ck { flex-direction: row; align-items: center; gap: 0.5rem; align-self: end; }
  .cf input:not([type="checkbox"]), .cf select { padding: 0.55rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-weight: 400; } .cf small { font-weight: 400; color: #9ca3af; } .tmp code { background: #f3f4f6; padding: 0.15rem 0.5rem; border-radius: 6px; user-select: all; }
  @media (max-width: 860px) { .row { grid-template-columns: 1fr; } .acts { justify-content: flex-start; } .cf { grid-template-columns: 1fr; } }
</style>
