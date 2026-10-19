<script lang="ts">
  import DateTimePicker from "$lib/components/datetime/DateTimePicker.svelte";
  import { onMount } from "svelte";
  import "$lib/components/home/home.css";
  import {
    adminCreateItem,
    adminDeleteItem,
    adminHomeConfig,
    adminPutSection,
    adminReorderItems,
    adminUpdateItem,
    adminUploadImage,
    clearHomeCache,
    type AdminItem,
    type AdminSection,
    type HeroSlide,
  } from "$lib/api/home";
  import Btn from "$lib/components/Btn.svelte";
  import HeroSlides from "$lib/components/home/HeroSlides.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";

  const KEY = "hero_slides";
  const pending = new Pending();

  const TRANSITIONS: [string, string, string][] = [
    ["stack", "Pile de cartes", "L'affiche du dessus s'envole, la suivante remonte."],
    ["fade", "Fondu enchaîné", "Les affiches se remplacent en douceur."],
    ["slide", "Glissement", "Les affiches glissent de côté."],
    ["zoom", "Zoom", "Zoom avant avec un léger flou."],
    ["flip", "Retournement 3D", "L'affiche se retourne comme une carte."],
    ["coverflow", "Coverflow 3D", "Les affiches voisines restent visibles en perspective."],
  ];
  const RATIOS: [string, string, string][] = [
    ["16/9", "Large 16:9 (conseillé)", "1600 × 900 px"],
    ["4/3", "Paysage 4:3", "1200 × 900 px"],
    ["1/1", "Carré 1:1", "1080 × 1080 px"],
    ["4/5", "Portrait 4:5", "1080 × 1350 px"],
    ["3/4", "Portrait 3:4", "900 × 1200 px"],
  ];

  type Form = {
    title: string; title_en: string; subtitle: string; subtitle_en: string;
    image_url: string; image_mobile: string; cta_label: string; cta_label_en: string; link_url: string;
    starts_at: string; ends_at: string; is_active: boolean;
    audience: "client" | "prestataire" | "both";
  };
  const EMPTY: Form = { title: "", title_en: "", subtitle: "", subtitle_en: "", image_url: "", image_mobile: "", cta_label: "", cta_label_en: "", link_url: "", starts_at: "", ends_at: "", is_active: true, audience: "client" };

  let section = $state<AdminSection | null>(null);
  let settings = $state<Record<string, any>>({});
  let items = $state<AdminItem[]>([]);
  let loading = $state(true);
  let editing = $state<number | "new" | null>(null);
  let form = $state<Form>({ ...EMPTY });
  let dragging = $state<"desktop" | "mobile" | null>(null);

  async function load() {
    loading = true;
    try {
      const all = await adminHomeConfig();
      const s = all.find((x) => x.key === KEY) ?? null;
      section = s;
      settings = s ? { ...s.payload } : {};
      items = s ? s.items_persisted ? s.items : [] : [];
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const touched = () => clearHomeCache();
  const mobileOf = (it: AdminItem) => (it.data?.image_mobile as string | undefined) ?? "";
  const audLabel = (it: AdminItem) => ({ client: "Client", prestataire: "Prestataire", both: "Client + Prestataire" })[(it.data?.audience as string) ?? "client"] ?? "Client";
  const dt = (v: string | null) => (v ? v.slice(0, 16) : "");
  const iso = (v: string) => (v ? `${v}:00` : null);

  // -------------------------------------------------------------- etat d'une affiche
  function statusOf(it: AdminItem): { label: string; tone: "on" | "off" | "soon" | "past" } {
    const now = Date.now();
    if (!it.is_active) return { label: "Masquée", tone: "off" };
    if (it.starts_at && new Date(it.starts_at + "Z").getTime() > now) return { label: "Programmée", tone: "soon" };
    if (it.ends_at && new Date(it.ends_at + "Z").getTime() < now) return { label: "Expirée", tone: "past" };
    return { label: "En ligne", tone: "on" };
  }

  // Apercu en direct : les vraies affiches avec les reglages en cours (non enregistres).
  let previewSlides = $derived<HeroSlide[]>(
    items
      .filter((i) => i.is_active && i.image_url)
      .map((i, n) => ({
        id: `p-${i.id ?? n}`, image_url: i.image_url as string, image_url_mobile: mobileOf(i) || null, title: i.title, subtitle: i.subtitle,
        cta_label: (i.data?.cta_label as string) || null, link_url: null,
      }))
  );
  let ratioHelp = $derived(RATIOS.find((r) => r[0] === (settings.ratio ?? "16/9")));

  // -------------------------------------------------------------- edition
  function openNew() {
    form = { ...EMPTY };
    editing = "new";
  }
  function openEdit(it: AdminItem) {
    form = {
      title: it.title ?? "", title_en: it.title_en ?? "", subtitle: it.subtitle ?? "", subtitle_en: it.subtitle_en ?? "",
      image_url: it.image_url ?? "", image_mobile: mobileOf(it), cta_label: (it.data?.cta_label as string) ?? "", cta_label_en: (it.data?.cta_label_en as string) ?? "",
      link_url: it.link_url ?? "", starts_at: dt(it.starts_at), ends_at: dt(it.ends_at), is_active: it.is_active,
      audience: ((it.data?.audience as Form["audience"]) ?? "client"),
    };
    editing = it.id;
  }

  function toInput(f: Form, sort_order: number) {
    const n = (v: string) => (v.trim() ? v.trim() : null);
    const data: Record<string, unknown> = {};
    if (n(f.image_mobile)) data.image_mobile = f.image_mobile.trim();
    if (n(f.cta_label)) data.cta_label = f.cta_label.trim();
    if (n(f.cta_label_en)) data.cta_label_en = f.cta_label_en.trim();
    data.audience = f.audience;
    return {
      kind: "poster", sort_order, is_active: f.is_active, title: n(f.title), title_en: n(f.title_en), subtitle: n(f.subtitle), subtitle_en: n(f.subtitle_en),
      body: null, body_en: null, icon: null, image_url: n(f.image_url), tone: null, link_url: n(f.link_url), ref_type: null, ref_id: null,
      data, starts_at: iso(f.starts_at), ends_at: iso(f.ends_at),
    } as const;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!form.image_url.trim()) {
      snackbar.error("Ajoutez l'image de l'affiche.");
      return;
    }
    if (form.starts_at && form.ends_at && form.ends_at <= form.starts_at) {
      snackbar.error("La fin de diffusion doit être après le début.");
      return;
    }
    const creating = editing === "new";
    await pending.run("save", async () => {
      try {
        if (creating) await adminCreateItem(KEY, { ...toInput(form, 0) });
        else if (typeof editing === "number") {
          const current = items.find((i) => i.id === editing);
          await adminUpdateItem(editing, { ...toInput(form, current?.sort_order ?? 0) });
        }
        touched();
        snackbar.success(creating ? "Affiche publiée." : "Affiche enregistrée.");
        editing = null;
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function upload(file: File | undefined, target: "desktop" | "mobile") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      snackbar.error("Choisissez un fichier image (JPG, PNG, WebP).");
      return;
    }
    await pending.run(`upload:${target}`, async () => {
      try {
        const { url } = await adminUploadImage(file);
        if (target === "desktop") form.image_url = url;
        else form.image_mobile = url;
        snackbar.success("Image envoyée.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  const onDrop = (e: DragEvent, target: "desktop" | "mobile") => {
    e.preventDefault();
    dragging = null;
    upload(e.dataTransfer?.files?.[0], target);
  };

  async function toggle(it: AdminItem) {
    await pending.run(`toggle:${it.id}`, async () => {
      try {
        const { id: _i, section_key: _s, ...rest } = it;
        await adminUpdateItem(it.id as number, { ...rest, is_active: !it.is_active });
        touched();
        snackbar.success(it.is_active ? "Affiche masquée du site." : "Affiche remise en ligne.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function remove(it: AdminItem) {
    const done = await confirmDialog.ask({
      title: "Supprimer cette affiche ?",
      message: `${it.title ? `« ${it.title} » ne` : "Elle ne"} s'affichera plus sur la page d'accueil. Pour la retirer temporairement, masquez-la plutôt.`,
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await adminDeleteItem(it.id as number);
        touched();
        await load();
      },
    });
    if (done) snackbar.success("Affiche supprimée.");
  }

  async function move(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    items = next;
    await pending.run("order", async () => {
      try {
        await adminReorderItems(KEY, next.map((i) => i.id as number));
        touched();
        snackbar.success("Ordre des affiches enregistré.");
      } catch (e) {
        snackbar.error((e as Error).message);
        await load();
      }
    });
  }

  // -------------------------------------------------------------- reglages du defilement
  async function saveSettings() {
    await pending.run("settings", async () => {
      try {
        await adminPutSection(KEY, {
          title: section?.title ?? null, title_en: section?.title_en ?? null, subtitle: section?.subtitle ?? null, subtitle_en: section?.subtitle_en ?? null,
          payload: settings, payload_en: {}, is_active: section?.is_active ?? true, sort_order: section?.sort_order ?? 0,
        });
        touched();
        snackbar.success("Réglages du défilement enregistrés.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
</script>

<div class="posters">
  <div class="intro">
    <p>
      Publiez ici <strong>vos affiches</strong> : elles défilent à droite du titre sur la page d'accueil. Chaque affiche est une image (le texte est dans l'image),
      avec en option une version mobile, un lien, un bouton et des dates de diffusion. L'aperçu ci-dessous reflète vos réglages en direct.
    </p>
    <div class="head-actions">
      <a class="btn btn-outline btn-sm" href="/accueil" target="_blank" rel="noopener"><ExternalLink size={14} /> Voir la page</a>
      <button type="button" class="btn btn-gold btn-sm" onclick={openNew}><Plus size={14} /> Nouvelle affiche</button>
    </div>
  </div>

  <div class="top">
    <!-- ----------------------------------------------------------- aperçu -->
    <div class="card preview-card">
      <h3>Aperçu</h3>
      <div class="ac preview">
        {#if previewSlides.length > 0}
          {#key `${settings.transition}-${settings.ratio}-${settings.fit}-${previewSlides.length}-${settings.show_caption}`}
            <HeroSlides
              slides={previewSlides}
              transition={settings.transition}
              autoplay={settings.autoplay !== false}
              interval={Number(settings.interval_ms) || 4500}
              pauseOnHover={settings.pause_on_hover !== false}
              loop={settings.loop !== false}
              showDots={settings.show_dots !== false}
              showArrows={settings.show_arrows !== false}
              showProgress={settings.show_progress !== false}
              ratio={settings.ratio}
              fit={settings.fit}
              showCaption={settings.show_caption === true}
            />
          {/key}
        {:else}
          <p class="empty">Aucune affiche en ligne : la zone à droite du titre n'affichera que l'encart « Paiement protégé ».</p>
        {/if}
      </div>
    </div>

    <!-- ----------------------------------------------------------- réglages -->
    <div class="card settings">
      <h3>Style de défilement</h3>
      <div class="styles" role="radiogroup" aria-label="Style de défilement">
        {#each TRANSITIONS as [value, label, hint]}
          <label class="style" class:on={settings.transition === value}>
            <input type="radio" name="transition" {value} bind:group={settings.transition} />
            <strong>{label}</strong>
            <small>{hint}</small>
          </label>
        {/each}
      </div>

      <div class="grid2">
        <label>Format des affiches
          <select bind:value={settings.ratio}>
            {#each RATIOS as [value, label, size]}<option {value}>{label} — {size}</option>{/each}
          </select>
        </label>
        <label>Ajustement de l'image
          <select bind:value={settings.fit}>
            <option value="cover">Remplir le cadre (image recadrée)</option>
            <option value="contain">Image entière (bandes possibles)</option>
          </select>
        </label>
        <label>Durée d'affichage (ms)
          <input type="number" min="1500" max="30000" step="250" bind:value={settings.interval_ms} />
        </label>
      </div>
      <div class="checks">
        <label class="switch"><input type="checkbox" bind:checked={settings.autoplay} /> Défilement automatique</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.pause_on_hover} /> Pause au survol</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.loop} /> Boucle</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.show_dots} /> Points</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.show_arrows} /> Flèches</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.show_progress} /> Barre de progression</label>
        <label class="switch"><input type="checkbox" bind:checked={settings.show_caption} /> Afficher titre / sous-titre sur l'image</label>
      </div>
      <div class="actions"><Btn class="btn-primary" loading={pending.is("settings")} onclick={saveSettings}>Enregistrer les réglages</Btn></div>
    </div>
  </div>

  <!-- --------------------------------------------------------------- éditeur -->
  {#if editing !== null}
    <form class="card editor" onsubmit={save}>
      <h3>{editing === "new" ? "Nouvelle affiche" : "Modifier l'affiche"}</h3>
      <div class="uploads">
        <div class="drop-wrap">
          <span class="lbl">Image de l'affiche <em>({ratioHelp?.[2] ?? "1200 × 900 px"})</em> *</span>
          <label class="drop" class:drag={dragging === "desktop"} ondragover={(e) => { e.preventDefault(); dragging = "desktop"; }} ondragleave={() => (dragging = null)} ondrop={(e) => onDrop(e, "desktop")}>
            {#if pending.is("upload:desktop")}
              <Spinner size="22px" /><span>Envoi…</span>
            {:else if form.image_url}
              <img src={form.image_url} alt="Aperçu de l'affiche" />
              <span class="change"><ImagePlus size={14} /> Changer</span>
            {:else}
              <ImagePlus size={26} /><span>Cliquez ou glissez une image ici</span><small>JPG, PNG, WebP</small>
            {/if}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onchange={(e) => upload(e.currentTarget.files?.[0], "desktop")} />
          </label>
        </div>
        <div class="drop-wrap">
          <span class="lbl">Version mobile <em>(optionnel, ex. 900 × 1200 px)</em></span>
          <label class="drop small" class:drag={dragging === "mobile"} ondragover={(e) => { e.preventDefault(); dragging = "mobile"; }} ondragleave={() => (dragging = null)} ondrop={(e) => onDrop(e, "mobile")}>
            {#if pending.is("upload:mobile")}
              <Spinner size="22px" /><span>Envoi…</span>
            {:else if form.image_mobile}
              <img src={form.image_mobile} alt="Aperçu mobile" />
              <span class="change"><ImagePlus size={14} /> Changer</span>
            {:else}
              <ImagePlus size={22} /><span>Image mobile</span>
            {/if}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onchange={(e) => upload(e.currentTarget.files?.[0], "mobile")} />
          </label>
          {#if form.image_mobile}<button type="button" class="link" onclick={() => (form.image_mobile = "")}>Retirer la version mobile</button>{/if}
        </div>
      </div>

      <div class="grid2">
        <label>Titre / texte alternatif (FR)<input type="text" bind:value={form.title} placeholder="Ex. Offre de lancement à Lomé" /></label>
        <label>Titre / texte alternatif (EN)<input type="text" bind:value={form.title_en} /></label>
        <label>Sous-titre (FR) <small>(affiché si l'option « titre sur l'image » est cochée)</small><input type="text" bind:value={form.subtitle} /></label>
        <label>Sous-titre (EN)<input type="text" bind:value={form.subtitle_en} /></label>
        <label>Bouton sur l'affiche (FR)<input type="text" bind:value={form.cta_label} placeholder="Ex. J'en profite" /></label>
        <label>Bouton sur l'affiche (EN)<input type="text" bind:value={form.cta_label_en} placeholder="E.g. Get the offer" /></label>
        <label class="span2">Publier sur
          <select bind:value={form.audience}>
            <option value="client">Accueil client</option>
            <option value="prestataire">Page « Devenir prestataire » (espace prestataire)</option>
            <option value="both">Les deux</option>
          </select>
        </label>
        <label class="span2">Lien au clic<input type="text" bind:value={form.link_url} placeholder="/recherche?q=plomberie ou https://…" /></label>
        <label>Début de diffusion <small>(optionnel, heure serveur UTC)</small><DateTimePicker bind:value={form.starts_at} /></label>
        <label>Fin de diffusion <small>(optionnel)</small><DateTimePicker bind:value={form.ends_at} /></label>
      </div>
      <label class="switch"><input type="checkbox" bind:checked={form.is_active} /> En ligne (visible sur le site)</label>
      <div class="actions">
        <Btn class="btn-ghost" disabled={pending.is("save")} onclick={() => (editing = null)}>Annuler</Btn>
        <Btn type="submit" class="btn-primary" loading={pending.is("save")}>{editing === "new" ? "Publier l'affiche" : "Enregistrer"}</Btn>
      </div>
    </form>
  {/if}

  <!-- --------------------------------------------------------------- liste -->
  {#if loading && items.length === 0}
    <div class="loading-state">Chargement...</div>
  {:else if items.length === 0}
    <div class="card empty-state">
      <ImagePlus size={30} />
      <p><strong>Aucune affiche publiée.</strong> Cliquez sur « Nouvelle affiche » pour ajouter la première.</p>
    </div>
  {:else}
    <div class="grid">
      {#each items as it, i (it.id)}
        {@const st = statusOf(it)}
        <article class="card poster" class:dim={st.tone !== "on"}>
          <div class="thumb" style="aspect-ratio: {settings.ratio ?? '4/3'}">
            {#if it.image_url}<img src={it.image_url} alt={it.title ?? ""} loading="lazy" />{/if}
            <span class="badge {st.tone}">{st.label}</span>
            {#if mobileOf(it)}<span class="badge mob">Mobile</span>{/if}
            <span class="badge aud">{audLabel(it)}</span>
          </div>
          <div class="meta">
            <strong>{it.title || "Sans titre"}</strong>
            <small>
              {it.link_url ? `→ ${it.link_url}` : "Sans lien"}
              {#if it.starts_at || it.ends_at} · {it.starts_at ? dt(it.starts_at).replace("T", " ") : "…"} → {it.ends_at ? dt(it.ends_at).replace("T", " ") : "…"}{/if}
            </small>
          </div>
          <div class="row-actions">
            <button type="button" aria-label="Monter" disabled={i === 0 || pending.is("order")} onclick={() => move(i, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label="Descendre" disabled={i === items.length - 1 || pending.is("order")} onclick={() => move(i, 1)}><ArrowDown size={15} /></button>
            <button type="button" aria-label={it.is_active ? "Masquer" : "Remettre en ligne"} title={it.is_active ? "Masquer" : "Remettre en ligne"} disabled={pending.is(`toggle:${it.id}`)} onclick={() => toggle(it)}>
              {#if pending.is(`toggle:${it.id}`)}<Spinner size="15px" />{:else if it.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
            </button>
            <button type="button" aria-label="Modifier" onclick={() => openEdit(it)}><Pencil size={15} /></button>
            <button type="button" class="danger" aria-label="Supprimer" onclick={() => remove(it)}><Trash2 size={15} /></button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .posters {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .intro {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }
  .intro p {
    margin: 0;
    max-width: 56rem;
    color: var(--ink-soft);
  }
  .head-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(0, 26rem) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  h3 {
    margin: 0 0 0.8rem;
  }
  .preview {
    background: transparent;
    padding: 0.2rem 0.2rem 0.4rem;
  }
  .empty {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
    background: var(--gold-soft);
    border-radius: 12px;
    padding: 1rem;
  }
  .styles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .style {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 0.6rem 0.8rem;
    cursor: pointer;
    background: #fff;
  }
  .style input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .style.on {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .style:has(input:focus-visible) {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }
  .style strong {
    font-size: 0.85rem;
  }
  .style small {
    font-size: 0.72rem;
    color: var(--muted);
    line-height: 1.35;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .grid2 label,
  .drop-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 0;
  }
  .grid2 small,
  .lbl em {
    font-weight: 400;
    font-style: normal;
    color: var(--muted);
  }
  .grid2 input,
  .grid2 select {
    width: 100%;
  }
  .span2 {
    grid-column: 1 / -1;
  }
  .checks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.4rem;
    margin-top: 1rem;
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .uploads {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 1rem;
  }
  .drop {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 11rem;
    border: 2px dashed #cbd5d0;
    border-radius: 14px;
    background: #fafaf7;
    color: var(--ink-soft);
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s, background 0.15s;
  }
  .drop.small {
    min-height: 11rem;
  }
  .drop:hover,
  .drop.drag {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .drop input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .drop img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #fff;
  }
  .change {
    position: absolute;
    right: 0.6rem;
    bottom: 0.6rem;
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    background: rgba(15, 23, 32, 0.78);
    color: #fff;
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    font-size: 0.72rem;
  }
  .link {
    align-self: flex-start;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.78rem;
    color: var(--danger);
    text-decoration: underline;
    cursor: pointer;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 1rem;
  }
  .poster {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem;
  }
  .poster.dim .thumb img {
    opacity: 0.5;
  }
  .thumb {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: var(--gold-soft);
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .badge {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.68rem;
    font-weight: 800;
    background: #fff;
  }
  .badge.on {
    background: #e2f3e8;
    color: var(--green-deep);
  }
  .badge.off {
    background: #ececef;
    color: #3f444d;
  }
  .badge.soon {
    background: #e3ecff;
    color: #2a3f7a;
  }
  .badge.past {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .badge.aud {
    top: auto;
    bottom: 0.5rem;
    background: #fff3cc;
    color: #8a6800;
  }
  .badge.mob {
    left: auto;
    right: 0.5rem;
    background: rgba(15, 23, 32, 0.75);
    color: #fff;
  }
  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .meta strong {
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta small {
    font-size: 0.72rem;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-actions {
    display: flex;
    gap: 0.1rem;
    justify-content: flex-end;
  }
  .row-actions button {
    border: 0;
    background: transparent;
    padding: 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: grid;
    place-items: center;
  }
  .row-actions button:hover:not(:disabled) {
    background: rgba(15, 23, 32, 0.08);
  }
  .row-actions button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .row-actions .danger:hover {
    color: var(--danger);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2rem;
    color: var(--muted);
    text-align: center;
  }
  @media (max-width: 900px) {
    .top,
    .uploads,
    .intro {
      grid-template-columns: 1fr;
      flex-direction: column;
    }
  }
  @media (max-width: 600px) {
    .grid2 {
      grid-template-columns: 1fr;
    }
  }
</style>
