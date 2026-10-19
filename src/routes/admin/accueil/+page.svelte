<script lang="ts">
  import { onMount } from "svelte";
  import {
    adminCatalogProviders,
    adminCatalogSubCategories,
    adminCreateItem,
    adminDeleteItem,
    adminHomeConfig,
    adminInitializeSection,
    adminPutSection,
    adminReorderItems,
    adminSectionsOrder,
    adminUpdateItem,
    clearHomeCache,
    type AdminItem,
    type AdminSection,
  } from "$lib/api/home";
  import Btn from "$lib/components/Btn.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  const LABELS: Record<string, string> = {
    topbar: "Bande verte (pays, paiement, aide)",
    hero: "Bandeau principal (titre, recherche, encart paiement)",
    hero_slides: "Affiches défilantes (à droite du titre)",
    popular_searches: "Recherches populaires",
    stats: "Chiffres clés",
    services: "Grille des services",
    guarantees: "Garanties",
    how_it_works: "Comment ça marche",
    top_providers: "Les mieux notés",
    pro: "Trankyl Pro",
    academy: "Trankyl Académie",
    news: "Actualités",
    testimonials: "Avis clients",
    partners: "Partenaires et presse",
    apps: "Applications mobiles",
  };

  const HINTS: Record<string, string> = {
    hero: "Le titre s'écrit lettre par lettre (réglable dans « Titre animé »). L'encart « Paiement protégé » se modifie dans les réglages ci-dessous.",
    hero_slides: "Les affiches (images) qui défilent à droite du titre se publient dans le menu « Affiches d'accueil » (avec aperçu en direct). Les réglages ci-dessous restent modifiables ici aussi.",
    popular_searches: "Les puces « Populaire » sous la barre de recherche : ajoutez, modifiez, réordonnez ou masquez-les ci-dessous (FR / EN).",
    services: "Mode « auto » : les sous-catégories les plus fournies du catalogue Trankyl. Ajoutez des cartes pour choisir vous-même (le nom et l'image sont lus dans le catalogue).",
    stats: "Source : vendors_total, certified_total, clients_total, bookings_total, countries_served (calculées en direct) ou manual (valeur saisie).",
    top_providers: "Classement automatique par note, avis et missions. Épinglez des prestataires pour les placer en tête.",
    testimonials: "Les avis approuvés s'affichent automatiquement (modération dans « Avis »). Les témoignages saisis ici passent en premier.",
    news: "Alimenté par les événements actifs (Blog). Règle ici le nombre d'articles.",
    topbar: "Pays : source « config » (liste ci-dessous) ou « db » (pays avec service actif). Le lien d'aide n'apparaît que s'il est renseigné.",
    apps: "Un bouton de store n'est affiché que si son lien est renseigné (champ Données).",
  };

  // Champs visibles pour chaque carte, par section.
  const ITEM_FIELDS: Record<string, string[]> = {
    popular_searches: ["title"],
    stats: ["title", "data"],
    services: ["ref_service", "title", "subtitle", "tone", "link_url"],
    guarantees: ["title", "body"],
    how_it_works: ["title", "body"],
    top_providers: ["ref_vendor"],
    pro: ["title", "subtitle", "tone"],
    testimonials: ["body", "subtitle"],
    partners: ["kind", "title", "image_url", "link_url"],
    apps: ["title", "subtitle", "tone", "image_url", "data"],
  };
  const TONES: Record<string, string[]> = {
    services: ["", "green", "gold", "grey", "yellow"],
    pro: ["", "highlight"],
    apps: ["yellow", "dark"],
  };
  const DEFAULT_KIND: Record<string, string> = {
    popular_searches: "chip", stats: "stat", services: "service", guarantees: "guarantee", how_it_works: "step",
    top_providers: "pinned", pro: "feature", testimonials: "review", partners: "supporter", apps: "app",
  };
  const FIELD_LABELS: Record<string, string> = { title: "Titre", subtitle: "Sous-titre", body: "Texte", tone: "Style", link_url: "Lien", image_url: "Logo / visuel (URL ou chemin)", data: "Données (JSON)", kind: "Type" };


  // Libelles lisibles, listes de choix et aides des reglages (cle = "section.reglage[.sous-reglage]").
  type Meta = { label?: string; hint?: string; options?: [string, string][]; min?: number; max?: number; step?: number };
  const META: Record<string, Meta> = {
    "hero.badge": { label: "Pastille au-dessus du titre" },
    "hero.search_placeholder": { label: "Texte d'exemple du champ de recherche" },
    "hero.search_button": { label: "Bouton de recherche" },
    "hero.popular_label": { label: "Libellé devant les puces populaires" },
    "hero.typewriter": { label: "Titre animé (machine à écrire)" },
    "hero.typewriter.enabled": { label: "Activer l'animation" },
    "hero.typewriter.speed_ms": { label: "Vitesse d'écriture (ms par lettre)", min: 10, max: 400, step: 5 },
    "hero.typewriter.erase_speed_ms": { label: "Vitesse d'effacement (ms par lettre)", min: 5, max: 300, step: 5 },
    "hero.typewriter.pause_ms": { label: "Pause avant de recommencer (ms)", min: 0, max: 20000, step: 100 },
    "hero.typewriter.loop": { label: "Recommencer en boucle" },
    "hero.typewriter.caret": { label: "Afficher le curseur clignotant" },
    "hero.pay_note": { label: "Encart « Paiement protégé »" },
    "hero.pay_note.kicker": { label: "Titre de l'encart" },
    "hero.pay_note.text": { label: "Texte de l'encart" },
    "hero.preview": { label: "Carte fixe de secours (utilisée seulement s'il n'y a aucune carte dans le bandeau défilant)" },
    "popular_searches.popular_label": { label: "Libellé devant les puces" },
    "hero_slides.ratio": { label: "Format des affiches", options: [["16/9", "Large 16:9 (conseillé) — 1600 × 900 px"], ["4/3", "Paysage 4:3 — 1200 × 900 px"], ["1/1", "Carré 1:1"], ["4/5", "Portrait 4:5"], ["3/4", "Portrait 3:4"]] },
    "hero_slides.fit": { label: "Ajustement de l'image", options: [["cover", "Remplir le cadre (recadrée)"], ["contain", "Image entière"]] },
    "hero_slides.show_caption": { label: "Afficher titre / sous-titre sur l'image" },
    "hero_slides.transition": {
      label: "Style de défilement",
      hint: "Pile de cartes : la carte du dessus s'envole · Fondu · Glissement · Zoom : fondu avec effet de flou · Retournement 3D · Coverflow : cartes voisines visibles en perspective.",
      options: [["stack", "Pile de cartes"], ["fade", "Fondu enchaîné"], ["slide", "Glissement"], ["zoom", "Zoom"], ["flip", "Retournement 3D"], ["coverflow", "Coverflow 3D"]],
    },
    "hero_slides.autoplay": { label: "Défilement automatique" },
    "hero_slides.interval_ms": { label: "Durée d'affichage d'une carte (ms)", min: 1500, max: 30000, step: 250 },
    "hero_slides.pause_on_hover": { label: "Pause quand la souris est dessus" },
    "hero_slides.loop": { label: "Revenir à la première carte (boucle)" },
    "hero_slides.show_dots": { label: "Afficher les points de navigation" },
    "hero_slides.show_arrows": { label: "Afficher les flèches" },
    "hero_slides.show_progress": { label: "Afficher la barre de progression" },
  };
  // Sections dont le titre / sous-titre ne sont pas affiches : on ne montre pas ces champs.
  const NO_TITLE = new Set(["hero_slides", "topbar", "popular_searches", "stats", "partners", "apps"]);
  const metaOf = (path: string): Meta => META[`${selectedKey}.${path}`] ?? {};
  const labelOf = (path: string, fallback: string) => metaOf(path).label ?? fallback;
  const isFlatObject = (v: unknown): v is Record<string, string | number | boolean> =>
    !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every((x) => ["string", "number", "boolean"].includes(typeof x));

  // Les traductions anglaises d'un sous-objet doivent exister avant d'etre liees aux champs.
  function normalize(list: AdminSection[]): AdminSection[] {
    for (const s of list) {
      for (const [k, v] of Object.entries(s.payload)) {
        if (isFlatObject(v) && (typeof s.payload_en[k] !== "object" || s.payload_en[k] === null)) s.payload_en[k] = {};
      }
    }
    return list;
  }
  // Supprime recursivement les champs vides : une traduction EN vide ne doit jamais ecraser le francais.
  function deepClean(o: unknown): unknown {
    if (Array.isArray(o)) return o;
    if (o && typeof o === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) {
        const c = deepClean(v);
        if (c === "" || c === null || c === undefined) continue;
        if (typeof c === "object" && !Array.isArray(c) && Object.keys(c as object).length === 0) continue;
        out[k] = c;
      }
      return out;
    }
    return o;
  }

  let sections = $state<AdminSection[]>([]);
  let selectedKey = $state<string>("hero");
  let loading = $state(true);
  const pending = new Pending();
  let subCategories = $state<{ id: number; name: string; category: string | null }[]>([]);
  let providers = $state<{ id: number; name: string; city: string | null }[]>([]);

  let sel = $derived(sections.find((s) => s.key === selectedKey));
  let fields = $derived(ITEM_FIELDS[selectedKey] ?? []);

  async function load(keepSelection = true) {
    loading = true;
    try {
      sections = normalize(await adminHomeConfig());
      if (!keepSelection || !sections.some((s) => s.key === selectedKey)) selectedKey = sections[0]?.key ?? "hero";
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    adminCatalogSubCategories().then((r) => (subCategories = r)).catch(() => {});
    adminCatalogProviders().then((r) => (providers = r)).catch(() => {});
  });

  function afterWrite() {
    clearHomeCache();
  }

  // ---------------------------------------------------------------- sections
  function sectionInput(s: AdminSection) {
    return {
      title: s.title || null, title_en: s.title_en || null, subtitle: s.subtitle || null, subtitle_en: s.subtitle_en || null,
      payload: s.payload, payload_en: deepClean(s.payload_en) as Record<string, any>, is_active: s.is_active, sort_order: s.sort_order,
    };
  }

  async function saveSection(s: AdminSection, message = "Section enregistrée.") {
    await pending.run(`section:${s.key}`, async () => {
      try {
        const saved = await adminPutSection(s.key, sectionInput(s));
        sections = sections.map((x) => (x.key === s.key ? { ...x, ...saved, items: x.items } : x));
        afterWrite();
        snackbar.success(message);
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function toggleActive(s: AdminSection) {
    s.is_active = !s.is_active;
    await saveSection(s, s.is_active ? `« ${LABELS[s.key] ?? s.key} » est affichée sur le site.` : `« ${LABELS[s.key] ?? s.key} » est masquée du site.`);
  }

  async function moveSection(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[index], next[j]] = [next[j], next[index]];
    sections = next;
    await pending.run("sections-order", async () => {
      try {
        await adminSectionsOrder(next.map((s) => s.key));
        afterWrite();
        await load();
        snackbar.success("Ordre des sections enregistré.");
      } catch (e) {
        snackbar.error((e as Error).message);
        await load();
      }
    });
  }

  // Edition des reglages (payload) : valeurs simples inline, objets en JSON.
  function isPlain(v: unknown) {
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  }
  function setJson(target: Record<string, any>, key: string, text: string) {
    try {
      target[key] = JSON.parse(text);
    } catch {
      snackbar.error(`JSON invalide pour « ${key} ».`);
    }
  }

  // ------------------------------------------------------------------- cartes
  async function personalize() {
    if (!sel) return;
    const key = sel.key;
    await pending.run(`personalize:${key}`, async () => {
      try {
        await adminInitializeSection(key);
        afterWrite();
        await load();
        snackbar.success("Contenu par défaut enregistré : vous pouvez le modifier.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  function itemInput(it: AdminItem) {
    const { id: _id, section_key: _k, ...rest } = it;
    return rest;
  }

  async function addItem() {
    if (!sel) return;
    if (!sel.items_persisted && sel.items.length > 0) await personalize();
    const s = sections.find((x) => x.key === selectedKey)!;
    s.items.push({
      id: null, section_key: s.key, kind: DEFAULT_KIND[s.key] ?? null, sort_order: 0, is_active: true,
      title: "", title_en: "", subtitle: "", subtitle_en: "", body: "", body_en: "", icon: null, image_url: null,
      tone: TONES[s.key]?.[0] || null, link_url: null, ref_type: null, ref_id: null, data: {}, starts_at: null, ends_at: null,
    });
  }

  async function saveItem(it: AdminItem, index: number) {
    if (!sel) return;
    const key = sel.key;
    const creating = it.id === null;
    await pending.run(`item:${key}:${it.id ?? `new-${index}`}`, async () => {
      try {
        const body = itemInput(it);
        if (creating) await adminCreateItem(key, body);
        else await adminUpdateItem(it.id as number, body);
        afterWrite();
        await load();
        snackbar.success(creating ? "Carte ajoutée." : "Carte enregistrée.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function removeItem(it: AdminItem, index: number) {
    if (!sel) return;
    if (it.id === null) {
      sel.items.splice(index, 1);
      return;
    }
    const id = it.id;
    const done = await confirmDialog.ask({
      title: "Supprimer cette carte ?",
      message: `« ${it.title || it.body?.slice(0, 50) || "Carte"} » ne s'affichera plus sur la page d'accueil.`,
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await adminDeleteItem(id);
        afterWrite();
        await load();
      },
    });
    if (done) snackbar.success("Carte supprimée.");
  }

  async function moveItem(index: number, delta: number) {
    if (!sel) return;
    const j = index + delta;
    if (j < 0 || j >= sel.items.length) return;
    const arr = [...sel.items];
    [arr[index], arr[j]] = [arr[j], arr[index]];
    sel.items = arr;
    const ids = arr.map((i) => i.id).filter((i): i is number => i !== null);
    if (sel.items_persisted && ids.length === arr.length) {
      const key = sel.key;
      await pending.run(`items-order:${key}`, async () => {
        try {
          await adminReorderItems(key, ids);
          afterWrite();
          snackbar.success("Ordre des cartes enregistré.");
        } catch (e) {
          snackbar.error((e as Error).message);
        }
      });
    }
  }

  function pickSubCategory(it: AdminItem, id: string) {
    it.ref_id = id ? Number(id) : null;
    it.ref_type = id ? "sub_category" : null;
  }
  function pickVendor(it: AdminItem, id: string) {
    it.ref_id = id ? Number(id) : null;
    it.ref_type = id ? "vendor" : null;
  }
</script>


{#snippet field(label: string, meta: Meta, obj: Record<string, any>, objEn: Record<string, any>, k: string)}
  {@const v = obj[k]}
  <div class="setting">
    <span class="key">{label}</span>
    {#if meta.options}
      <select bind:value={obj[k]}>
        {#each meta.options as [value, text]}<option {value}>{text}</option>{/each}
      </select>
    {:else if typeof v === "boolean"}
      <label class="switch"><input type="checkbox" bind:checked={obj[k]} /> {v ? "oui" : "non"}</label>
    {:else if typeof v === "number"}
      <input type="number" bind:value={obj[k]} min={meta.min} max={meta.max} step={meta.step} />
    {:else if typeof v === "string" && v.length > 70}
      <div class="pair">
        <textarea rows="3" bind:value={obj[k]} placeholder="FR"></textarea>
        <textarea rows="3" bind:value={objEn[k]} placeholder="EN"></textarea>
      </div>
    {:else}
      <div class="pair">
        <input type="text" bind:value={obj[k]} placeholder="FR" />
        <input type="text" bind:value={objEn[k]} placeholder="EN" />
      </div>
    {/if}
    {#if meta.hint}<small class="hint-inline">{meta.hint}</small>{/if}
  </div>
{/snippet}

<div class="home-admin">
  <div class="intro">
    <p>
      Configurez chaque section de la page d'accueil : textes (FR/EN), réglages, cartes, ordre et visibilité. Tant qu'une section n'est pas enregistrée,
      le site affiche son contenu par défaut. Les modifications sont visibles sur le site en quelques secondes.
    </p>
    <a class="btn btn-outline btn-sm" href="/accueil" target="_blank" rel="noopener"><ExternalLink size={14} /> Voir la page</a>
  </div>

  {#if loading && sections.length === 0}
    <div class="loading-state">Chargement...</div>
  {:else}
    <div class="layout">
      <!-- ------------------------------------------------------------ sections -->
      <aside class="card list">
        <h3>Sections</h3>
        <ol>
          {#each sections as s, i (s.key)}
            <li class:active={s.key === selectedKey} class:off={!s.is_active}>
              <button type="button" class="pick" onclick={() => (selectedKey = s.key)}>
                <span>{LABELS[s.key] ?? s.key}</span>
                {#if !s.persisted}<em>défaut</em>{/if}
              </button>
              <span class="row-actions">
                <button type="button" aria-label="Monter" disabled={i === 0 || pending.is("sections-order")} onclick={() => moveSection(i, -1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label="Descendre" disabled={i === sections.length - 1 || pending.is("sections-order")} onclick={() => moveSection(i, 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label={s.is_active ? "Masquer" : "Afficher"} disabled={pending.is(`section:${s.key}`)} onclick={() => toggleActive(s)}>
                  {#if pending.is(`section:${s.key}`)}<Spinner size="14px" />{:else if s.is_active}<Eye size={14} />{:else}<EyeOff size={14} />{/if}
                </button>
              </span>
            </li>
          {/each}
        </ol>
      </aside>

      <!-- ------------------------------------------------------------- editeur -->
      {#if sel}
        <section class="editor">
          <div class="card">
            <div class="card-head">
              <h3>{LABELS[sel.key] ?? sel.key}</h3>
              <label class="switch"><input type="checkbox" bind:checked={sel.is_active} /> Affichée</label>
            </div>
            {#if HINTS[sel.key]}<p class="hint">{HINTS[sel.key]}</p>{/if}

            {#if !NO_TITLE.has(sel.key)}
            <div class="grid2">
              <label>Titre (FR)<input type="text" bind:value={sel.title} /></label>
              <label>Titre (EN)<input type="text" bind:value={sel.title_en} /></label>
              <label>Sous-titre (FR)<textarea rows="2" bind:value={sel.subtitle}></textarea></label>
              <label>Sous-titre (EN)<textarea rows="2" bind:value={sel.subtitle_en}></textarea></label>
            </div>
            {/if}

            {#if Object.keys(sel.payload).length > 0}
              <h4>Réglages</h4>
              <div class="settings">
                {#each Object.keys(sel.payload) as key (key)}
                  {@const v = sel.payload[key]}
                  {#if isFlatObject(v)}
                    <fieldset class="group">
                      <legend>{labelOf(key, key)}</legend>
                      {#each Object.keys(v) as sub (sub)}
                        {@render field(labelOf(`${key}.${sub}`, sub), metaOf(`${key}.${sub}`), sel.payload[key], sel.payload_en[key], sub)}
                      {/each}
                    </fieldset>
                  {:else if typeof v === "object" && v !== null}
                    <div class="setting">
                      <span class="key">{labelOf(key, key)}</span>
                      <div class="pair">
                        <textarea rows="4" class="mono" value={JSON.stringify(v, null, 2)} onchange={(e) => setJson(sel.payload, key, e.currentTarget.value)}></textarea>
                        {#if key in sel.payload_en}
                          <textarea rows="4" class="mono" value={JSON.stringify(sel.payload_en[key], null, 2)} onchange={(e) => setJson(sel.payload_en, key, e.currentTarget.value)}></textarea>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    {@render field(labelOf(key, key), metaOf(key), sel.payload, sel.payload_en, key)}
                  {/if}
                {/each}
              </div>
            {/if}

            <div class="actions">
              <Btn class="btn-primary" loading={pending.is(`section:${sel.key}`)} onclick={() => saveSection(sel)}>Enregistrer la section</Btn>
            </div>
          </div>

          {#if sel.key === "hero_slides"}
            <div class="card">
              <div class="card-head">
                <h3>Affiches</h3>
                <a class="btn btn-gold btn-sm" href="/admin/affiches">Gérer les affiches</a>
              </div>
              <p class="hint">Ajout, ordre, dates de diffusion, version mobile, lien et bouton de chaque affiche : page « Affiches d'accueil », avec un aperçu en direct du défilement.</p>
            </div>
          {/if}

          <!-- ---------------------------------------------------------- cartes -->
          {#if fields.length > 0}
            <div class="card">
              <div class="card-head">
                <h3>Cartes ({sel.items.length})</h3>
                <div class="head-actions">
                  {#if !sel.items_persisted && sel.items.length > 0}
                    <Btn class="btn-outline btn-sm" loading={pending.is(`personalize:${sel.key}`)} onclick={personalize}>Personnaliser le contenu par défaut</Btn>
                  {/if}
                  <Btn class="btn-gold btn-sm" loading={pending.is(`personalize:${sel.key}`)} onclick={addItem}><Plus size={14} /> Ajouter</Btn>
                </div>
              </div>
              {#if !sel.items_persisted && sel.items.length > 0}
                <p class="hint">Ces cartes sont celles par défaut du site : cliquez « Personnaliser » avant de les modifier.</p>
              {/if}

              {#each sel.items as it, i (it.id ?? `new-${i}`)}
                <div class="item" class:off={!it.is_active}>
                  <div class="item-bar">
                    <strong>{it.title || it.body?.slice(0, 40) || (it.ref_id ? `#${it.ref_id}` : "Nouvelle carte")}</strong>
                    <span class="row-actions">
                      <button type="button" aria-label="Monter" disabled={i === 0 || pending.is(`items-order:${sel.key}`)} onclick={() => moveItem(i, -1)}><ArrowUp size={14} /></button>
                      <button type="button" aria-label="Descendre" disabled={i === sel.items.length - 1 || pending.is(`items-order:${sel.key}`)} onclick={() => moveItem(i, 1)}><ArrowDown size={14} /></button>
                      <button type="button" aria-label="Supprimer" class="danger" onclick={() => removeItem(it, i)}><Trash2 size={14} /></button>
                    </span>
                  </div>

                  <div class="grid2">
                    {#if fields.includes("ref_service")}
                      <label class="span2">Service du catalogue Trankyl
                        <select value={it.ref_type === "sub_category" ? String(it.ref_id ?? "") : ""} onchange={(e) => pickSubCategory(it, e.currentTarget.value)}>
                          <option value="">— Aucun (texte libre) —</option>
                          {#each subCategories as c}<option value={String(c.id)}>{c.name}{c.category ? ` (${c.category})` : ""}</option>{/each}
                        </select>
                      </label>
                    {/if}
                    {#if fields.includes("ref_vendor")}
                      <label class="span2">Prestataire épinglé
                        <select value={it.ref_type === "vendor" ? String(it.ref_id ?? "") : ""} onchange={(e) => pickVendor(it, e.currentTarget.value)}>
                          <option value="">— Choisir —</option>
                          {#each providers as p}<option value={String(p.id)}>{p.name}{p.city ? ` — ${p.city}` : ""}</option>{/each}
                        </select>
                      </label>
                    {/if}
                    {#if fields.includes("kind")}
                      <label>{FIELD_LABELS.kind}
                        <select bind:value={it.kind}><option value="supporter">Ils nous soutiennent</option><option value="press">Vu dans la presse</option></select>
                      </label>
                    {/if}
                    {#if fields.includes("title")}
                      <label>{FIELD_LABELS.title} (FR)<input type="text" bind:value={it.title} /></label>
                      <label>{FIELD_LABELS.title} (EN)<input type="text" bind:value={it.title_en} /></label>
                    {/if}
                    {#if fields.includes("subtitle")}
                      <label>{FIELD_LABELS.subtitle} (FR)<input type="text" bind:value={it.subtitle} /></label>
                      <label>{FIELD_LABELS.subtitle} (EN)<input type="text" bind:value={it.subtitle_en} /></label>
                    {/if}
                    {#if fields.includes("body")}
                      <label>{FIELD_LABELS.body} (FR)<textarea rows="3" bind:value={it.body}></textarea></label>
                      <label>{FIELD_LABELS.body} (EN)<textarea rows="3" bind:value={it.body_en}></textarea></label>
                    {/if}
                    {#if fields.includes("tone")}
                      <label>{FIELD_LABELS.tone}
                        <select bind:value={it.tone}>
                          {#each TONES[sel.key] ?? [""] as t}<option value={t || null}>{t || "(par défaut)"}</option>{/each}
                        </select>
                      </label>
                    {/if}
                    {#if fields.includes("link_url")}
                      <label>{FIELD_LABELS.link_url}<input type="text" bind:value={it.link_url} placeholder="/recherche?q=…" /></label>
                    {/if}
                    {#if fields.includes("image_url")}
                      <label class="span2">{FIELD_LABELS.image_url}<input type="text" bind:value={it.image_url} placeholder="/partners/ifc.svg ou https://…" /></label>
                    {/if}
                    {#if fields.includes("data")}
                      <label class="span2">{FIELD_LABELS.data}
                        <textarea rows="3" class="mono" value={JSON.stringify(it.data ?? {}, null, 2)} onchange={(e) => { try { it.data = JSON.parse(e.currentTarget.value || "{}"); } catch { snackbar.error("JSON invalide."); } }}></textarea>
                      </label>
                    {/if}
                  </div>

                  <div class="item-foot">
                    <label class="switch"><input type="checkbox" bind:checked={it.is_active} /> Affichée</label>
                    <Btn class="btn-primary btn-sm" loading={pending.is(`item:${sel.key}:${it.id ?? `new-${i}`}`)} onclick={() => saveItem(it, i)}>Enregistrer la carte</Btn>
                  </div>
                </div>
              {/each}
              {#if sel.items.length === 0}<p class="hint">Aucune carte pour l'instant.</p>{/if}
            </div>
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .home-admin {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .intro {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .intro p {
    margin: 0;
    max-width: 60rem;
    color: var(--ink-soft);
  }
  .layout {
    display: grid;
    grid-template-columns: 19rem minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  .list {
    padding: 1rem;
    position: sticky;
    top: 5rem;
  }
  .list h3 {
    margin: 0 0 0.6rem;
    font-size: 0.95rem;
  }
  .list ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    border-radius: 10px;
    padding: 0.15rem 0.3rem 0.15rem 0;
  }
  .list li.active {
    background: var(--green-soft);
  }
  .list li.off .pick {
    opacity: 0.5;
  }
  .pick {
    flex: 1;
    text-align: left;
    background: none;
    border: 0;
    padding: 0.5rem 0.6rem;
    font: inherit;
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink);
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
  }
  .pick em {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--muted);
  }
  .row-actions {
    display: inline-flex;
    gap: 0.15rem;
  }
  .row-actions button {
    border: 0;
    background: transparent;
    padding: 0.3rem;
    border-radius: 6px;
    cursor: pointer;
    color: var(--ink-soft);
    display: grid;
    place-items: center;
  }
  .row-actions button:hover:not(:disabled) {
    background: rgba(15, 23, 32, 0.08);
  }
  .row-actions button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .row-actions .danger:hover {
    color: var(--danger);
  }
  .editor {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-width: 0;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }
  .card-head h3 {
    margin: 0;
  }
  .head-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .hint {
    margin: 0 0 0.9rem;
    font-size: 0.82rem;
    color: var(--muted);
  }
  h4 {
    margin: 1.2rem 0 0.5rem;
    font-size: 0.9rem;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .grid2 label,
  .setting {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 0;
  }
  .span2 {
    grid-column: 1 / -1;
  }
  .grid2 input,
  .grid2 textarea,
  .grid2 select,
  .settings input,
  .settings textarea {
    width: 100%;
  }
  .settings {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .setting .key {
    font-size: 0.8rem;
    color: var(--ink);
    font-weight: 600;
  }
  .setting .switch {
    align-self: flex-start;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .group {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.8rem 1rem 1rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .group legend {
    padding: 0 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .hint-inline {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--muted);
    line-height: 1.4;
  }
  .setting select {
    max-width: 24rem;
  }
  .image-field .lbl {
    font-size: 0.8rem;
    font-weight: 600;
  }
  .image-row {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .image-row input[type="text"] {
    flex: 1;
    min-width: 12rem;
  }
  .thumb {
    width: 3.2rem;
    height: 2.4rem;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .upload {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    background: #fff;
    white-space: nowrap;
  }
  .upload:hover {
    background: var(--green-soft);
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.78rem;
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
  }
  .item {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.9rem;
    margin-top: 0.8rem;
  }
  .item.off {
    opacity: 0.65;
  }
  .item-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
    gap: 0.5rem;
  }
  .item-bar strong {
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.8rem;
  }

  @media (max-width: 960px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .list {
      position: static;
    }
    .intro {
      flex-direction: column;
    }
  }
  @media (max-width: 640px) {
    .grid2,
    .pair {
      grid-template-columns: 1fr;
    }
  }
</style>
