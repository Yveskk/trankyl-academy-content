<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Search from "@lucide/svelte/icons/search";
  import Btn from "$lib/components/Btn.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import {
    createMyService,
    getServiceCatalog,
    getServiceLocations,
    updateMyService,
    uploadServiceImage,
    type CatalogCategory,
    type CatalogSub,
    type Locations,
    type ServiceDetail,
    type ServiceInput,
  } from "$lib/api/providerServices";

  let { initial = null, api = null, backHref = "/prestataire/services" }: { initial?: ServiceDetail | null; api?: { load: () => Promise<{ catalog: { categories: CatalogCategory[] }; locations: Locations }>; save: (body: ServiceInput, id?: number) => Promise<unknown>; upload?: (file: File) => Promise<string> } | null; backHref?: string } = $props();
  const editing = !!initial;

  let categories = $state<CatalogCategory[]>([]);
  let loc = $state<Locations | null>(null);
  let ready = $state(false);
  let saving = $state(false);
  let uploading = $state(false);

  // ---- valeurs du formulaire
  let subId = $state<number | null>(initial?.subcategory.id ?? null);
  let subQuery = $state("");
  let title = $state(initial?.title ?? "");
  let description = $state(initial?.description ?? "");
  let years = $state(initial?.experience_years ?? 0);
  let tools = $state<string[]>(initial?.tools ?? []);
  let toolDraft = $state("");
  let notes = $state(initial?.notes ?? "");
  let prices = $state<Record<number, string>>(Object.fromEntries((initial?.units ?? []).map((u) => [u.unit_id, String(u.price)])));
  let options = $state<{ name: string; price: string }[]>((initial?.options ?? []).map((o) => ({ name: o.name, price: String(o.price) })));
  let type = $state<"home" | "online">(initial?.type ?? "home");
  let cityId = $state<number | null>(initial?.city_id ?? null);
  let districtIds = $state<number[]>(initial?.district_ids ?? []);
  let districtQuery = $state("");
  let images = $state<string[]>(initial?.images ?? []);
  let isActive = $state(initial?.is_active ?? true);
  let touched = $state(false);

  onMount(async () => {
    try {
      const { catalog: c, locations: l } = api ? await api.load() : { catalog: await getServiceCatalog(i18n.locale), locations: await getServiceLocations() };
      categories = c.categories;
      loc = l;
      if (!editing && !cityId) cityId = l.default_city_id;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      ready = true;
    }
  });

  const allSubs = $derived(categories.flatMap((c) => c.subcategories.map((s) => ({ ...s, category: c.name }))));
  const sub = $derived<(CatalogSub & { category: string }) | null>(allSubs.find((s) => s.id === subId) ?? null);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const subMatches = $derived.by(() => {
    const q = norm(subQuery.trim());
    return q ? allSubs.filter((s) => norm(`${s.name} ${s.category}`).includes(q)) : allSubs;
  });
  // Unites du metier ; a defaut, un simple forfait (unit_id 0).
  const unitRows = $derived(sub ? (sub.units.length ? sub.units : [{ id: 0, label: i18n.locale === "en" ? "Flat rate" : "Forfait" }]) : []);
  const city = $derived(loc?.cities.find((c) => c.id === cityId) ?? null);
  const shownDistricts = $derived.by(() => {
    const q = norm(districtQuery.trim());
    return (city?.districts ?? []).filter((d) => !q || norm(d.name).includes(q));
  });
  const pricedUnits = $derived(unitRows.filter((u) => Number(prices[u.id]) > 0));
  const minPrice = $derived(pricedUnits.length ? Math.min(...pricedUnits.map((u) => Number(prices[u.id]))) : 0);

  function pickSub(s: CatalogSub) {
    if (subId !== s.id) prices = {};
    subId = s.id;
  }
  function pickCity(id: number) {
    cityId = id;
    districtIds = [];
    districtQuery = "";
  }
  const toggleDistrict = (id: number) => (districtIds = districtIds.includes(id) ? districtIds.filter((d) => d !== id) : [...districtIds, id]);
  function addTool() {
    const t = toolDraft.trim();
    if (t && !tools.includes(t) && tools.length < 15) tools = [...tools, t.slice(0, 60)];
    toolDraft = "";
  }
  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])].slice(0, 6 - images.length);
    input.value = "";
    if (!files.length) return;
    uploading = true;
    try {
      for (const f of files) images = [...images, await (api?.upload ?? uploadServiceImage)(f)];
    } catch (err) {
      snackbar.error((err as Error).message);
    } finally {
      uploading = false;
    }
  }
  const move = (i: number) => {
    const a = [...images];
    [a[0], a[i]] = [a[i], a[0]];
    images = a;
  };

  const errors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (!subId) e.sub = "Choisissez le métier concerné.";
    if (title.trim().length < 3) e.title = "Donnez un titre (3 caractères minimum).";
    if (description.trim().length < 10) e.description = "Décrivez votre service (10 caractères minimum).";
    if (!pricedUnits.length) e.prices = "Indiquez au moins un tarif.";
    if (options.some((o) => (o.name.trim() && !(Number(o.price) >= 0 && o.price !== "")) || (!o.name.trim() && o.price !== ""))) e.options = "Chaque option a un nom et un prix.";
    if (type === "home") {
      if (!cityId) e.city = "Choisissez la ville.";
      else if (!districtIds.length) e.districts = "Choisissez au moins un quartier.";
    }
    return e;
  });

  async function save() {
    touched = true;
    const first = Object.values(errors)[0];
    if (first) {
      snackbar.error(first);
      return;
    }
    const body: ServiceInput = {
      subcategory_id: subId!,
      title: title.trim(),
      description: description.trim(),
      experience_years: Math.max(0, Math.min(60, Math.round(Number(years) || 0))),
      units: pricedUnits.map((u) => ({ unit_id: u.id, price: Math.round(Number(prices[u.id])) })),
      options: options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), price: Math.round(Number(o.price) || 0) })),
      tools,
      notes: notes.trim(),
      images,
      type,
      city_id: type === "home" ? cityId : null,
      district_ids: type === "home" ? districtIds : [],
      is_active: isActive,
    };
    saving = true;
    try {
      if (api) await api.save(body, initial?.id);
      else if (initial) await updateMyService(initial.id, body);
      else await createMyService(body);
      snackbar.success(editing ? "Service mis à jour." : isActive ? "Service publié : les clients peuvent le réserver." : "Service enregistré (masqué).");
      goto(backHref);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      saving = false;
    }
  }
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
</script>

{#if !ready}
  <div class="pw-empty">Chargement…</div>
{:else}
  <div class="sf">
    <div class="sf-main">
      <section class="pw-box" class:bad={touched && errors.sub}>
        <h2>1. Quel métier ?</h2>
        {#if sub}
          <div class="sf-picked"><div><strong>{sub.name}</strong><span class="pw-sm">{sub.category}</span></div><button type="button" class="link" onclick={() => (subId = null)}>Changer</button></div>
        {:else}
          <label class="pw-search"><Search size={15} /><input type="search" placeholder="Rechercher : plomberie, ménage, coiffure…" bind:value={subQuery} /></label>
          <div class="sf-subs">
            {#each subMatches as s (s.id)}
              <button type="button" onclick={() => pickSub(s)}><strong>{s.name}</strong><span>{s.category}</span></button>
            {:else}<p class="pw-muted">Aucun métier ne correspond.</p>{/each}
          </div>
        {/if}
        {#if touched && errors.sub}<p class="err">{errors.sub}</p>{/if}
      </section>

      <section class="pw-box">
        <h2>2. Présentez votre service</h2>
        <label>Titre<input type="text" maxlength="120" placeholder="Ex. : Dépannage plomberie à domicile" bind:value={title} class:bad={touched && errors.title} /></label>
        <label>Description<textarea rows="5" maxlength="2000" placeholder="Ce que vous faites, comment vous travaillez, ce qui est inclus…" bind:value={description} class:bad={touched && errors.description}></textarea><small>{description.length}/2000</small></label>
        <div class="row2">
          <label>Années d'expérience<input type="number" min="0" max="60" bind:value={years} /></label>
          <label>Matériel utilisé
            <div class="chips">
              {#each tools as t}<span class="chip">{t}<button type="button" aria-label="Retirer" onclick={() => (tools = tools.filter((x) => x !== t))}><X size={12} /></button></span>{/each}
              <input type="text" placeholder="Ajouter + Entrée" maxlength="60" bind:value={toolDraft} onkeydown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTool(); } }} onblur={addTool} />
            </div>
          </label>
        </div>
        <label>Notes pour le client (facultatif)<textarea rows="2" maxlength="1000" placeholder="Ex. : précisez les animaux, l'accès, les horaires…" bind:value={notes}></textarea></label>
      </section>

      <section class="pw-box" class:bad={touched && errors.prices}>
        <h2>3. Vos tarifs</h2>
        {#if !sub}<p class="pw-muted">Choisissez d'abord un métier pour voir les unités de tarification.</p>
        {:else}
          <p class="pw-muted">Renseignez un prix pour chaque unité que vous proposez (laissez vide sinon).</p>
          <div class="sf-units">
            {#each unitRows as u (u.id)}
              <label class="unit"><span>{u.label}</span><span class="money"><input type="number" min="0" max="10000000" step="100" inputmode="numeric" placeholder="0" bind:value={prices[u.id]} /><em>FCFA</em></span></label>
            {/each}
          </div>
          {#if touched && errors.prices}<p class="err">{errors.prices}</p>{/if}
        {/if}
        <h3>Options payantes <small>(facultatif)</small></h3>
        {#each options as o, i}
          <div class="opt"><input type="text" placeholder="Ex. : Matériel fourni" maxlength="80" bind:value={o.name} /><span class="money"><input type="number" min="0" placeholder="0" bind:value={o.price} /><em>FCFA</em></span><button type="button" class="ico" aria-label="Retirer l'option" onclick={() => (options = options.filter((_, j) => j !== i))}><X size={16} /></button></div>
        {/each}
        {#if touched && errors.options}<p class="err">{errors.options}</p>{/if}
        {#if options.length < 10}<button type="button" class="link" onclick={() => (options = [...options, { name: "", price: "" }])}><Plus size={14} /> Ajouter une option</button>{/if}
      </section>

      <section class="pw-box">
        <h2>4. Où intervenez-vous ?</h2>
        <div class="seg">
          <button type="button" class:on={type === "home"} onclick={() => (type = "home")}>Sur place / à domicile</button>
          <button type="button" class:on={type === "online"} onclick={() => (type = "online")}>À distance (en ligne)</button>
        </div>
        <p class="pw-muted">Pays du service : <strong>{loc?.country.name ?? "—"}</strong> (celui de votre profil).</p>
        {#if type === "home"}
          <label>Ville
            <select value={cityId ?? ""} onchange={(e) => pickCity(Number(e.currentTarget.value))} class:bad={touched && errors.city}>
              <option value="" disabled>Choisir une ville</option>
              {#each loc?.cities ?? [] as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
            </select>
          </label>
          {#if city}
            <div class="dist-head">
              <label class="pw-search"><Search size={15} /><input type="search" placeholder="Filtrer les quartiers" bind:value={districtQuery} /></label>
              <button type="button" class="link" onclick={() => (districtIds = [...new Set([...districtIds, ...shownDistricts.map((d) => d.id)])])}>Tout sélectionner</button>
              <button type="button" class="link" onclick={() => (districtIds = [])}>Effacer</button>
            </div>
            <div class="dists">
              {#each shownDistricts as d (d.id)}<button type="button" class:on={districtIds.includes(d.id)} onclick={() => toggleDistrict(d.id)}>{d.name}</button>{:else}<p class="pw-muted">Aucun quartier.</p>{/each}
            </div>
            <small>{districtIds.length} quartier(s) sélectionné(s)</small>
            {#if touched && errors.districts}<p class="err">{errors.districts}</p>{/if}
          {/if}
        {/if}
      </section>

      <section class="pw-box">
        <h2>5. Photos <small>(facultatif, 6 maximum)</small></h2>
        <div class="sf-imgs">
          {#each images as url, i (url)}
            <figure><img src={url} alt="" loading="lazy" />{#if i === 0}<figcaption>Principale</figcaption>{:else}<button type="button" class="mk" onclick={() => move(i)}>Principale</button>{/if}<button type="button" class="rm" aria-label="Retirer la photo" onclick={() => (images = images.filter((u) => u !== url))}><X size={14} /></button></figure>
          {/each}
          {#if images.length < 6}
            <label class="add" class:busy={uploading}><ImagePlus size={22} /><span>{uploading ? "Envoi…" : "Ajouter"}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onchange={onFiles} /></label>
          {/if}
        </div>
      </section>
    </div>

    <aside class="sf-side">
      <div class="pw-box">
        <h2>Récapitulatif</h2>
        <dl>
          <dt>Métier</dt><dd>{sub?.name ?? "—"}</dd>
          <dt>À partir de</dt><dd>{minPrice ? `${fmt(minPrice)} FCFA` : "—"}</dd>
          <dt>Tarifs</dt><dd>{pricedUnits.length}</dd>
          <dt>Zone</dt><dd>{type === "online" ? "En ligne" : city ? `${city.name} · ${districtIds.length} quartier(s)` : "—"}</dd>
          <dt>Photos</dt><dd>{images.length}</dd>
        </dl>
        <label class="sw"><input type="checkbox" bind:checked={isActive} /><span>{isActive ? "Visible par les clients" : "Masqué (brouillon)"}</span></label>
        <Btn class="btn-primary" loading={saving} onclick={save}>{editing ? "Enregistrer" : "Publier le service"}</Btn>
        <a class="link" href={backHref}>Annuler</a>
      </div>
    </aside>
  </div>
{/if}

<style>
  .sf { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 1rem; align-items: start; }
  .sf-main { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .sf-side { position: sticky; top: 1rem; }
  h3 { margin: 0.4rem 0 0; font-size: 0.95rem; } h3 small, h2 small { font-weight: 500; color: #6b7280; font-size: 0.78rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.82rem; font-weight: 700; color: #374151; }
  label small { font-weight: 500; color: #9ca3af; align-self: flex-end; }
  input[type="text"], input[type="number"], input[type="search"], select, textarea { padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-weight: 400; background: #fff; width: 100%; box-sizing: border-box; min-width: 0; }
  .bad, .bad input, input.bad, textarea.bad, select.bad { border-color: #dc2626 !important; }
  .err { margin: 0; color: #b91c1c; font-size: 0.8rem; }
  .row2 { display: grid; grid-template-columns: 12rem 1fr; gap: 1rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; padding: 0.35rem; border: 1px solid #d1d5db; border-radius: 10px; }
  .chips input { border: none !important; flex: 1; min-width: 8rem; padding: 0.2rem 0.4rem !important; }
  .chip { display: inline-flex; align-items: center; gap: 0.25rem; background: #e8f5ec; color: #14532d; border-radius: 999px; padding: 0.15rem 0.3rem 0.15rem 0.65rem; font-size: 0.78rem; font-weight: 600; }
  .chip button, .ico { display: inline-flex; border: none; background: none; cursor: pointer; color: inherit; padding: 0.15rem; }
  .link { display: inline-flex; align-items: center; gap: 0.3rem; border: none; background: none; color: #0f7d41; font: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 0; width: fit-content; text-decoration: none; }
  .sf-picked { display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: #f0f9f3; border: 1px solid #bfe3cb; border-radius: 12px; padding: 0.7rem 1rem; }
  .sf-picked div { display: flex; flex-direction: column; }
  .sf-subs { display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 0.5rem; max-height: 17rem; overflow: auto; }
  .sf-subs button { display: flex; flex-direction: column; text-align: left; gap: 0.1rem; padding: 0.6rem 0.8rem; border: 1px solid #e5e7eb; background: #fff; border-radius: 10px; cursor: pointer; font: inherit; }
  .sf-subs button:hover { border-color: #0f7d41; }
  .sf-subs span { font-size: 0.74rem; color: #6b7280; }
  .sf-units { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.6rem; }
  .unit { flex-direction: row; justify-content: space-between; align-items: center; gap: 0.6rem; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.5rem 0.7rem; }
  .money { display: inline-flex; align-items: center; gap: 0.35rem; } .money input { width: 7.5rem; text-align: right; } .money em { font-style: normal; font-size: 0.75rem; color: #6b7280; }
  .opt { display: flex; gap: 0.5rem; align-items: center; }
  .seg { display: inline-flex; background: #e9ebef; border-radius: 10px; padding: 0.2rem; width: fit-content; max-width: 100%; flex-wrap: wrap; }
  .seg button { border: none; background: none; padding: 0.45rem 0.9rem; border-radius: 8px; font: inherit; font-weight: 700; font-size: 0.82rem; color: #6b7280; cursor: pointer; }
  .seg button.on { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
  .dist-head { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .dists { display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 13rem; overflow: auto; }
  .dists button { border: 1px solid #d1d5db; background: #fff; border-radius: 999px; padding: 0.3rem 0.8rem; font: inherit; font-size: 0.8rem; cursor: pointer; }
  .dists button.on { background: #0f7d41; border-color: #0f7d41; color: #fff; }
  .sf-imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 0.6rem; }
  figure { position: relative; margin: 0; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #f3f4f6; }
  figure img { width: 100%; height: 100%; object-fit: cover; }
  figcaption, .mk { position: absolute; left: 0.3rem; bottom: 0.3rem; background: rgba(0, 0, 0, 0.65); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; border: none; }
  .mk { cursor: pointer; opacity: 0; } figure:hover .mk, .mk:focus { opacity: 1; }
  .rm { position: absolute; top: 0.3rem; right: 0.3rem; display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: none; background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; }
  .add { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; border: 2px dashed #c4c8d0; border-radius: 12px; cursor: pointer; color: #6b7280; font-size: 0.78rem; }
  .add:hover { border-color: #0f7d41; color: #0f7d41; } .add.busy { opacity: 0.6; pointer-events: none; }
  .sw { flex-direction: row; align-items: center; gap: 0.5rem; } .sw input { width: 1.05rem; height: 1.05rem; accent-color: #0f7d41; }
  @media (max-width: 960px) { .sf { grid-template-columns: 1fr; } .sf-side { position: static; } .row2 { grid-template-columns: 1fr; } }
</style>
