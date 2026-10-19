<script lang="ts">
  import TimePicker from "$lib/components/datetime/TimePicker.svelte";
  import { onMount } from "svelte";
  import {
    adminAddMedia,
    adminDeleteMedia,
    adminGetAvailability,
    adminGetProviderProfile,
    adminListMedia,
    adminPutAvailability,
    type Media,
    type Slot,
    adminListProviders,
    adminPutProviderProfile,
    type ProviderListItem,
    type ProviderProfile,
  } from "$lib/api/providersAdmin";
  import { clearHomeCache } from "$lib/api/home";
  import Btn from "$lib/components/Btn.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let query = $state("");
  let onlyCertified = $state(true);
  let list = $state<ProviderListItem[]>([]);
  let loading = $state(true);
  let selectedId = $state<number | null>(null);
  let profile = $state<ProviderProfile | null>(null);
  const pending = new Pending();
  let timer: ReturnType<typeof setTimeout>;

  // Realisations et disponibilites du prestataire selectionne
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  let media = $state<Media[]>([]);
  let newMedia = $state({ kind: "photo" as Media["kind"], url: "", caption: "" });
  let slots = $state<{ weekday: number; start: string; end: string }[]>([]);

  const hhmm = (t: string) => t.slice(0, 5);
  async function loadExtras(id: number) {
    try {
      [media, slots] = await Promise.all([
        adminListMedia(id),
        adminGetAvailability(id).then((r) => r.map((s: Slot) => ({ weekday: s.weekday, start: hhmm(s.start_time), end: hhmm(s.end_time) }))),
      ]);
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
  async function addMedia() {
    if (!profile || !newMedia.url.trim()) return;
    const id = profile.vendor_id;
    await pending.run("media-add", async () => {
      try {
        await adminAddMedia(id, { kind: newMedia.kind, url: newMedia.url.trim(), thumb_url: null, caption: newMedia.caption.trim() || null, sort_order: media.length * 10, is_active: true });
        newMedia = { kind: "photo", url: "", caption: "" };
        media = await adminListMedia(id);
        clearHomeCache();
        snackbar.success("Réalisation ajoutée.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function removeMedia(m: Media) {
    const done = await confirmDialog.ask({
      title: "Supprimer cette réalisation ?",
      message: m.caption ? `« ${m.caption} » ne sera plus visible sur le profil du prestataire.` : "Elle ne sera plus visible sur le profil du prestataire.",
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await adminDeleteMedia(m.id);
        media = media.filter((x) => x.id !== m.id);
      },
    });
    if (done) snackbar.success("Réalisation supprimée.");
  }
  function addSlot(weekday: number) {
    slots.push({ weekday, start: "08:00", end: "17:00" });
  }
  async function saveSlots() {
    if (!profile) return;
    const id = profile.vendor_id;
    await pending.run("slots", async () => {
      try {
        const payload: Slot[] = slots.map((s) => ({ weekday: s.weekday, start_time: `${s.start}:00`, end_time: `${s.end}:00`, is_active: true }));
        await adminPutAvailability(id, payload);
        snackbar.success("Disponibilités enregistrées.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function search() {
    loading = true;
    try {
      list = await adminListProviders(query, onlyCertified);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await search();
    const id = Number(new URLSearchParams(location.search).get("id"));
    if (id) {
      onlyCertified = false;
      open(id);
    }
  });

  function onQuery() {
    clearTimeout(timer);
    timer = setTimeout(search, 300);
  }

  async function open(id: number) {
    selectedId = id;
    profile = null;
    media = [];
    slots = [];
    try {
      profile = await adminGetProviderProfile(id);
      loadExtras(id);
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function save() {
    if (!profile) return;
    const current = profile;
    await pending.run("save", async () => {
      try {
        const { vendor_id, persisted: _p, ...body } = current;
        // Les champs vides sont enregistres comme "non renseigne".
        const num = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));
        const clean = {
          ...body,
          headline: body.headline || null, about: body.about || null, about_en: body.about_en || null,
          cover_image_url: body.cover_image_url || null, public_slug: body.public_slug || null,
          zone_label: body.zone_label || null, services_note: body.services_note || null, services_note_en: body.services_note_en || null,
          visit_fee: num(body.visit_fee), years_experience: num(body.years_experience), service_radius_km: num(body.service_radius_km),
          response_time_minutes: num(body.response_time_minutes), on_time_rate: num(body.on_time_rate),
        };
        profile = await adminPutProviderProfile(vendor_id, clean);
        clearHomeCache();
        snackbar.success("Profil enregistré.");
        await search();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
</script>

<div class="providers">
  <div class="intro">
    <p>
      Complétez ce que la fiche prestataire Trankyl ne contient pas : temps de réponse, ponctualité, assurance, lien public, et mise en avant
      sur l'accueil (« Les mieux notés »). Un prestataire sans profil enrichi reste affiché normalement.
    </p>
  </div>

  <div class="layout">
    <aside class="card list">
      <input type="search" placeholder="Rechercher un prestataire…" bind:value={query} oninput={onQuery} />
      <label class="switch"><input type="checkbox" bind:checked={onlyCertified} onchange={search} /> Prestataires Academy uniquement</label>
      {#if loading}
        <p class="muted">Chargement...</p>
      {:else}
        <ul>
          {#each list as p (p.vendor_id)}
            <li>
              <button type="button" class:active={p.vendor_id === selectedId} onclick={() => open(p.vendor_id)}>
                <span>{p.name}</span>
                <small>
                  {p.city ?? "—"}
                  {#if p.is_featured}· ★ à la une{/if}
                  {#if !p.is_verified}· non vérifié{/if}
                </small>
              </button>
            </li>
          {:else}
            <li class="muted">Aucun résultat.</li>
          {/each}
        </ul>
      {/if}
    </aside>

    {#if profile}
      <section class="card form">
        <h3>Profil enrichi — prestataire #{profile.vendor_id}</h3>
        <div class="grid2">
          <label class="span2">Accroche<input type="text" bind:value={profile.headline} /></label>
          <label>À propos (FR)<textarea rows="4" bind:value={profile.about}></textarea></label>
          <label>À propos (EN)<textarea rows="4" bind:value={profile.about_en}></textarea></label>
          <label class="span2">Photo de couverture (URL)<input type="text" bind:value={profile.cover_image_url} /></label>
          <label>Temps de réponse (minutes)<input type="number" min="0" bind:value={profile.response_time_minutes} /></label>
          <label>Missions à l'heure (%)<input type="number" min="0" max="100" step="0.1" bind:value={profile.on_time_rate} /></label>
          <label>Lien public (slug)<input type="text" placeholder="kossi-plombier" bind:value={profile.public_slug} /></label>
          <label>Frais de déplacement + diagnostic (FCFA)<input type="number" min="0" bind:value={profile.visit_fee} /></label>
          <label>Années d'expérience<input type="number" min="0" max="80" bind:value={profile.years_experience} /></label>
          <label>Rayon d'intervention (km)<input type="number" min="0" max="500" bind:value={profile.service_radius_km} /></label>
          <label>Libellé de la zone<input type="text" placeholder="Rayon 8 km autour de Bè" bind:value={profile.zone_label} /></label>
          <label>Note sous le tableau des prix (FR)<textarea rows="2" bind:value={profile.services_note}></textarea></label>
          <label>Note sous le tableau des prix (EN)<textarea rows="2" bind:value={profile.services_note_en}></textarea></label>
          <label>Badge « Top prestataire »
            <select bind:value={profile.top_override}>
              <option value={null}>Automatique (note ≥ 4,8 et ≥ 50 missions)</option>
              <option value={1}>Toujours affiché</option>
              <option value={0}>Jamais affiché</option>
            </select>
          </label>
        </div>
        <div class="checks">
          <label class="switch"><input type="checkbox" bind:checked={profile.is_insured} /> Assuré (dommages)</label>
          <label class="switch"><input type="checkbox" bind:checked={profile.is_address_verified} /> Adresse vérifiée</label>
          <label class="switch"><input type="checkbox" bind:checked={profile.is_featured} /> Mis en avant sur l'accueil</label>
          {#if profile.is_featured}
            <label class="inline">Position<input type="number" min="0" bind:value={profile.featured_order} /></label>
          {/if}
        </div>
        <div class="actions">
          <Btn class="btn-primary" loading={pending.is("save")} onclick={save}>Enregistrer</Btn>
        </div>

        <h4>Réalisations</h4>
        <div class="media-grid">
          {#each media as m (m.id)}
            <figure class="media">
              {#if m.kind === "video"}<div class="media-video">▶ Vidéo</div>{:else}<img src={m.thumb_url ?? m.url} alt={m.caption ?? ""} loading="lazy" />{/if}
              <button type="button" class="media-del" aria-label="Supprimer" onclick={() => removeMedia(m)}>×</button>
              <figcaption>{m.caption ?? ""}</figcaption>
            </figure>
          {:else}
            <p class="muted">Aucune réalisation.</p>
          {/each}
        </div>
        <div class="media-add">
          <select bind:value={newMedia.kind}><option value="photo">Photo</option><option value="before_after">Avant / après</option><option value="video">Vidéo</option></select>
          <input type="text" placeholder="URL de l'image ou de la vidéo" bind:value={newMedia.url} />
          <input type="text" placeholder="Légende (optionnel)" bind:value={newMedia.caption} />
          <Btn class="btn-gold btn-sm" loading={pending.is("media-add")} onclick={addMedia}>Ajouter</Btn>
        </div>

        <h4>Disponibilités hebdomadaires</h4>
        <p class="muted">Sans aucune plage, le prestataire reste visible mais sans créneaux affichés.</p>
        <div class="week">
          {#each DAYS as day, wd}
            <div class="day">
              <strong>{day}</strong>
              <div class="ranges">
                {#each slots as s, i}
                  {#if s.weekday === wd}
                    <span class="range">
                      <span class="tp"><TimePicker bind:value={s.start} /></span> – <span class="tp"><TimePicker bind:value={s.end} /></span>
                      <button type="button" aria-label="Retirer" onclick={() => slots.splice(i, 1)}>×</button>
                    </span>
                  {/if}
                {/each}
                <button type="button" class="add-range" onclick={() => addSlot(wd)}>+ plage</button>
              </div>
            </div>
          {/each}
        </div>
        <div class="actions">
          <Btn class="btn-primary btn-sm" loading={pending.is("slots")} onclick={saveSlots}>Enregistrer les disponibilités</Btn>
        </div>
      </section>
    {:else if selectedId}
      <p class="muted">Chargement du profil...</p>
    {:else}
      <p class="muted">Sélectionnez un prestataire.</p>
    {/if}
  </div>
</div>

<style>
  .providers {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .intro p {
    margin: 0;
    max-width: 56rem;
    color: var(--ink-soft);
  }
  .layout {
    display: grid;
    grid-template-columns: 20rem minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .list input[type="search"] {
    width: 100%;
  }
  .list ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    max-height: 32rem;
    overflow: auto;
  }
  .list li button {
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    border-radius: 10px;
    padding: 0.5rem 0.6rem;
    cursor: pointer;
    font: inherit;
    display: flex;
    flex-direction: column;
  }
  .list li button:hover,
  .list li button.active {
    background: var(--green-soft);
  }
  .list small,
  .muted {
    color: var(--muted);
    font-size: 0.78rem;
  }
  .form h3 {
    margin: 0 0 1rem;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .grid2 label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .grid2 input,
  .grid2 textarea,
  .grid2 select {
    width: 100%;
  }
  .span2 {
    grid-column: 1 / -1;
  }
  .checks {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.6rem;
    margin-top: 1rem;
    align-items: center;
  }
  .switch,
  .inline {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .inline input {
    width: 5rem;
  }
  .actions {
    margin-top: 1.2rem;
    display: flex;
    justify-content: flex-end;
  }
  h4 {
    margin: 1.6rem 0 0.5rem;
    font-size: 0.95rem;
  }
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.6rem;
  }
  .media {
    position: relative;
    margin: 0;
    font-size: 0.72rem;
    color: var(--muted);
  }
  .media img,
  .media-video {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 10px;
    background: var(--gold-soft);
    display: grid;
    place-items: center;
  }
  .media-del {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    border: 0;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    background: rgba(15, 23, 32, 0.75);
    color: #fff;
    cursor: pointer;
  }
  .media-add {
    display: grid;
    grid-template-columns: 9rem 1fr 1fr auto;
    gap: 0.5rem;
    margin-top: 0.7rem;
  }
  .week {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .day {
    display: grid;
    grid-template-columns: 6rem 1fr;
    align-items: start;
    gap: 0.6rem;
    font-size: 0.84rem;
  }
  .ranges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
    align-items: center;
  }
  .range {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .tp {
    display: inline-block;
    width: 6.4rem;
  }
  .range button,
  .add-range {
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: var(--green-dark);
    font-weight: 600;
  }
  @media (max-width: 900px) {
    .media-add {
      grid-template-columns: 1fr;
    }
    .layout,
    .grid2 {
      grid-template-columns: 1fr;
    }
  }
</style>
