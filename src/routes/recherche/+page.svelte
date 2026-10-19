<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { searchProviders, type SearchItem } from "$lib/api/directory";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { site } from "$lib/stores/site.svelte";
  import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "$lib/utils/leaflet";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  let params = $derived(data.params);
  let search = $derived(data.search);
  let interp = $derived(data.search?.interpretation);

  // ------------------------------------------------------------ resultats
  let extra = $state<SearchItem[]>([]);
  let loadingMore = $state(false);
  let items = $derived([...(search?.items ?? []), ...extra]);
  let total = $derived(search?.total ?? 0);
  $effect(() => {
    void data.search; // nouvelle recherche : on repart de la premiere page
    extra = [];
  });

  async function loadMore() {
    loadingMore = true;
    try {
      const more = await searchProviders({ ...params, availability: params.availability || "", country: site.country, lang: i18n.locale, limit: data.pageSize, offset: items.length });
      extra = [...extra, ...more.items];
    } catch {
      // l'utilisateur peut recliquer
    } finally {
      loadingMore = false;
    }
  }

  // ------------------------------------------------------------ URL <-> filtres
  let query = $state("");
  $effect(() => {
    query = params.q ?? "";
  });

  function nav(patch: Record<string, string | null>) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    goto(u.pathname + u.search, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function submitSearch(event: SubmitEvent) {
    event.preventDefault();
    // Nouvelle requete : on retire les filtres propres a l'ancienne (dispo auto notamment).
    nav({ q: query.trim() || null, dispo: null });
  }

  const toggleFlag = (key: string, current: boolean) => nav({ [key]: current ? null : "1" });
  const setAvailability = (v: string) => nav({ dispo: params.availability === v && !data.autoAvailability ? "" : v });
  const setRating = (v: number) => nav({ note: params.min_rating === v ? null : String(v) });
  function toggleLanguage(l: string) {
    const cur = params.languages ?? [];
    const next = cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l];
    nav({ langs: next.length ? next.join(",") : null });
  }

  const TRUST = [
    { key: "id", prop: "identity", fr: "Identité vérifiée", en: "Identity verified" },
    { key: "cert", prop: "certified", fr: "Certifié Académie", en: "Academy certified" },
    { key: "ass", prop: "insured", fr: "Assuré (dommages)", en: "Insured (damage)" },
    { key: "top", prop: "top", fr: "Top Prestataire", en: "Top provider" },
  ] as const;
  const AVAIL = [
    { key: "today", fr: "Aujourd'hui", en: "Today" },
    { key: "tomorrow", fr: "Demain", en: "Tomorrow" },
    { key: "weekend", fr: "Ce week-end", en: "This weekend" },
  ];
  const LANGS = ["Français", "Éwé", "Mina", "Kabiyè"];
  const SORTS = [
    { key: "recommended", fr: "Recommandés", en: "Recommended" },
    { key: "rating", fr: "Mieux notés", en: "Top rated" },
    { key: "price", fr: "Prix croissant", en: "Lowest price" },
    { key: "distance", fr: "Distance", en: "Distance" },
    { key: "missions", fr: "Plus de missions", en: "Most jobs" },
  ];

  // Mode de reservation : choix de l'utilisateur (pas d'effet serveur pour l'instant).
  let booking = $state<"basic" | "premium">("basic");
  let filtersOpen = $state(false);

  // ------------------------------------------------------------ localisation
  let locOpen = $state(false);
  let locating = $state(false);
  let locationLabel = $derived(params.district ? `${params.city || data.locations[0]?.city || ""}, ${params.district}` : params.lat != null ? t("Autour de moi", "Near me") : params.city || data.locations[0]?.city || t("Lieu", "Location"));

  function pickLocation(city: string, district: string | null) {
    locOpen = false;
    nav({ ville: city, quartier: district, lat: null, lng: null });
  }
  function locateMe() {
    locOpen = false;
    if (!navigator.geolocation) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        nav({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), quartier: null, tri: "distance" });
      },
      () => (locating = false),
      { timeout: 8000 }
    );
  }

  // ------------------------------------------------------------ interpretation (bandeau SITA)
  const urgencyLabel = (u: string | null | undefined) =>
    u === "today" ? t("aujourd'hui", "today") : u === "tomorrow" ? t("demain", "tomorrow") : u === "weekend" ? t("ce week-end", "this weekend") : null;
  const fmt = (n: number) => n.toLocaleString(en ? "en-US" : "fr-FR").replace(/ | /g, " ");
  let showSita = $derived(!!params.q && !!interp && (!!interp.label || interp.keywords.length > 0 || !!interp.urgency || !!interp.budget));

  let heading = $derived.by(() => {
    const parts = [`${total} ${total > 1 ? t("prestataires", "providers") : t("prestataire", "provider")}`];
    if (interp?.label) parts.push(`${t("en", "in")} ${interp.label}`);
    let s = parts.join(" ");
    const av = urgencyLabel(params.availability || null);
    if (av) s += ` ${t("disponibles", "available")} ${av}`;
    return s;
  });
  let near = $derived(params.district ? `${t("près de", "near")} ${params.district}` : "");

  // ------------------------------------------------------------ vue Liste / Carte
  let view = $state<"list" | "map">("list");
  let mapEl = $state<HTMLDivElement | undefined>();
  let mapError = $state<string | null>(null);

  $effect(() => {
    if (view !== "map" || !mapEl) return;
    const list = items.filter((i) => i.lat != null && i.lng != null);
    let map: any;
    let cancelled = false;
    mapError = null;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl) return;
        map = L.map(mapEl, { scrollWheelZoom: true });
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        const pts: [number, number][] = [];
        for (const p of list) {
          pts.push([p.lat!, p.lng!]);
          L.marker([p.lat!, p.lng!])
            .addTo(map)
            .bindPopup(`<strong>${p.name}</strong><br>${p.job ?? ""}${p.rating ? `<br>★ ${p.rating}` : ""}<br><a href="${p.profile_url}">${t("Voir le profil", "View profile")}</a>`);
        }
        if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
        else map.setView([6.1375, 1.223], 12);
      })
      .catch((e) => (mapError = (e as Error).message));
    return () => {
      cancelled = true;
      map?.remove();
    };
  });

  // ------------------------------------------------------------ cartes
  // "Reserver" : page des services du prestataire, avec son prochain creneau pre-selectionne.
  const bookUrl = (p: SearchItem) => `${p.profile_url}/reserver${p.next_slot_iso ? `?slot=${encodeURIComponent(p.next_slot_iso)}` : ""}`;
  const slotText = (s: string | null) => (s ? s.replace("|", " ") : null);
  const AVATAR_TONES = ["yellow", "green", "grey", "gold"];
  let hasFilters = $derived(!!(params.availability || params.min_rating || params.identity || params.certified || params.insured || params.top || params.languages?.length));

  function resetFilters() {
    nav({ dispo: "", note: null, id: null, cert: null, ass: null, top: null, langs: null });
  }
</script>

<Seo title={t("Recherche de prestataires", "Find a provider")} description={t("Plombiers, électriciens, nounous et artisans vérifiés et formés, près de chez vous.", "Verified and trained plumbers, electricians, nannies and craftspeople near you.")} noindex />

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="rs">
  <div class="rs-header">
    <div class="rs-wrap rs-header-inner">
      <form class="rs-search" onsubmit={submitSearch}>
        <input type="text" bind:value={query} aria-label={t("Décrivez votre besoin", "Describe your need")} placeholder={t("Ex : « mon robinet de cuisine fuit depuis hier »", "E.g. “my kitchen tap has been leaking since yesterday”")} />
        <button type="submit">{t("Rechercher", "Search")}</button>
      </form>
      <div class="rs-loc">
        <button type="button" class="rs-location" aria-expanded={locOpen} onclick={() => (locOpen = !locOpen)}>{locating ? "…" : locationLabel} <span aria-hidden="true">▾</span></button>
        {#if locOpen}
          <button type="button" class="rs-loc-backdrop" aria-label="Fermer" onclick={() => (locOpen = false)}></button>
          <div class="rs-loc-menu" role="menu">
            <button type="button" role="menuitem" onclick={locateMe}>📍 {t("Autour de moi", "Near me")}</button>
            {#each data.locations as loc}
              <button type="button" role="menuitem" class="rs-loc-city" onclick={() => pickLocation(loc.city, null)}>{loc.city} — {t("toute la ville", "whole city")}</button>
              {#each loc.districts as d}
                <button type="button" role="menuitem" onclick={() => pickLocation(loc.city, d)}>{d}</button>
              {/each}
            {/each}
            {#if data.locations.length === 0}<span class="rs-loc-empty">{t("Aucune localité disponible", "No location available")}</span>{/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="rs-wrap rs-body">
    {#if showSita && interp}
      <div class="rs-sita">
        <span class="rs-sita-pill">{t("SITA a compris", "SITA understood")}</span>
        <p>
          {#if interp.label}<strong>{interp.label}</strong>{/if}
          {#if interp.keywords.length}{interp.label ? " · " : ""}{interp.keywords.join(" / ")}{/if}
          {#if interp.urgency} · {t("urgence", "urgency")} : <strong>{urgencyLabel(interp.urgency)}</strong>{/if}
          {#if params.district || params.city} · {[params.city, params.district].filter(Boolean).join(", ")}{/if}
          {#if interp.budget} · {t("budget estimé", "estimated budget")} <strong>{fmt(interp.budget.low)} – {fmt(interp.budget.high)} FCFA</strong> ({t("pièce en sus", "parts extra")}){/if}
        </p>
        <a class="rs-sita-link" href="/prestataires">{t("Préciser avec SITA", "Refine with SITA")} →</a>
      </div>
    {/if}

    <div class="rs-grid">
      <button type="button" class="rs-filters-toggle" aria-expanded={filtersOpen} aria-controls="rs-filters" onclick={() => (filtersOpen = !filtersOpen)}>
        {t("Filtres", "Filters")} {#if hasFilters}•{/if} <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
      </button>

      <aside id="rs-filters" class="rs-filters" class:open={filtersOpen} aria-label={t("Filtres", "Filters")}>
        <fieldset>
          <legend>{t("Confiance", "Trust")}</legend>
          {#each TRUST as opt}
            <label class="rs-check">
              <input type="checkbox" checked={params[opt.prop]} onchange={() => toggleFlag(opt.key, !!params[opt.prop])} />
              <span class="rs-box" aria-hidden="true"></span>
              {en ? opt.en : opt.fr}
            </label>
          {/each}
        </fieldset>

        <fieldset>
          <legend>{t("Disponibilité", "Availability")}</legend>
          <div class="rs-pills">
            {#each AVAIL as opt}
              <button type="button" class="rs-pill" class:on={params.availability === opt.key} aria-pressed={params.availability === opt.key} onclick={() => setAvailability(opt.key)}>{en ? opt.en : opt.fr}</button>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("Note minimum", "Minimum rating")}</legend>
          <div class="rs-pills">
            {#each [4, 4.5] as r}
              <button type="button" class="rs-pill" class:on={params.min_rating === r} aria-pressed={params.min_rating === r} onclick={() => setRating(r)}>{String(r).replace(".", en ? "." : ",")}+</button>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("Langues parlées", "Languages spoken")}</legend>
          <div class="rs-pills">
            {#each LANGS as l}
              <button type="button" class="rs-pill" class:on={params.languages?.includes(l)} aria-pressed={params.languages?.includes(l)} onclick={() => toggleLanguage(l)}>{l}</button>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("Mode de réservation", "Booking mode")}</legend>
          <label class="rs-radio">
            <input type="radio" name="booking" value="basic" bind:group={booking} />
            <span class="rs-dot" aria-hidden="true"></span>
            {t("Basic — je choisis moi-même", "Basic — I choose myself")}
          </label>
          <label class="rs-radio">
            <input type="radio" name="booking" value="premium" bind:group={booking} onchange={() => goto("/prestataires?mode=chat")} />
            <span class="rs-dot" aria-hidden="true"></span>
            {t("Premium — Trankyl choisit et suit pour moi", "Premium — Trankyl chooses and follows up for me")}
          </label>
        </fieldset>

        {#if hasFilters}<button type="button" class="rs-reset" onclick={resetFilters}>{t("Réinitialiser les filtres", "Reset filters")}</button>{/if}

        <div class="rs-tip">
          <p><strong>{t("Pas le temps de comparer ?", "No time to compare?")}</strong> {t("Publiez votre demande : les prestataires disponibles vous envoient leur devis en moins d'une heure.", "Post your request: available providers send you their quote within an hour.")}</p>
          <a href="/prestataires">{t("Publier ma demande", "Post my request")} →</a>
        </div>
      </aside>

      <section class="rs-results">
        <div class="rs-results-head">
          <h1>{heading} {#if near}<span>{near}</span>{/if}</h1>
          <div class="rs-controls">
            <button type="button" class="rs-view" class:on={view === "list"} aria-pressed={view === "list"} onclick={() => (view = "list")}>{t("Liste", "List")}</button>
            <button type="button" class="rs-view" class:on={view === "map"} aria-pressed={view === "map"} onclick={() => (view = "map")}>{t("Carte", "Map")}</button>
            <label class="rs-sort">
              <span class="rs-sort-label">{t("Trier", "Sort")} :</span>
              <select value={params.sort ?? "recommended"} onchange={(e) => nav({ tri: e.currentTarget.value === "recommended" ? null : e.currentTarget.value })}>
                {#each SORTS as s}<option value={s.key}>{en ? s.en : s.fr}</option>{/each}
              </select>
            </label>
          </div>
        </div>

        {#if data.error}
          <p class="rs-empty">{t("Impossible de contacter le serveur. Réessayez dans un instant.", "Unable to reach the server. Please try again shortly.")}</p>
        {:else if items.length === 0}
          <div class="rs-empty">
            <p><strong>{t("Aucun prestataire ne correspond.", "No provider matches.")}</strong></p>
            <p>{t("Essayez d'élargir votre recherche ou de retirer un filtre.", "Try broadening your search or removing a filter.")}</p>
            {#if hasFilters}<button type="button" class="rs-btn rs-btn-outline rs-inline" onclick={resetFilters}>{t("Réinitialiser les filtres", "Reset filters")}</button>{/if}
          </div>
        {:else if view === "map"}
          <div class="rs-map" bind:this={mapEl} role="application" aria-label={t("Carte des prestataires", "Provider map")}></div>
          {#if mapError}<p class="rs-empty">{mapError}</p>{/if}
        {:else}
          <div class="rs-list">
            {#each items as p, i (p.vendor_id)}
              <article class="rs-card">
                <a class="rs-photo" href={p.profile_url} aria-label={p.name}>
                  {#if p.image_url}<img src={p.image_url} alt="" loading="lazy" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />{/if}
                  <span class="rs-photo-initials">{p.initials}</span>
                </a>

                <div class="rs-info">
                  <div class="rs-name-row">
                    <span class="rs-avatar rs-tone-{AVATAR_TONES[i % AVATAR_TONES.length]}">{p.initials}</span>
                    <a class="rs-name" href={p.profile_url}><strong>{p.name}</strong></a>
                    {#if p.badges.top}<span class="rs-top">{t("TOP PRESTATAIRE", "TOP PROVIDER")}</span>{/if}
                  </div>
                  <p class="rs-meta">
                    {#if p.rating}<span class="rs-star">★ <strong>{p.rating.toLocaleString(en ? "en-US" : "fr-FR", { minimumFractionDigits: 1 })}</strong></span>{/if}
                    {#if p.reviews_count > 0} ({p.reviews_count} {t("avis vérifiés", "verified reviews")}){/if}
                    {#if p.missions > 0} · {p.missions} {t("missions", "jobs")}{/if}
                    {#if p.distance_km != null} · {p.distance_km.toLocaleString(en ? "en-US" : "fr-FR")} km{/if}
                    {#if p.response_minutes} · {t("répond en", "replies in")} {p.response_minutes} min{/if}
                  </p>
                  <div class="rs-tags">
                    {#if p.badges.verified}<span class="rs-tag rs-tag-green">✓ {t("Identité vérifiée", "Identity verified")}</span>{/if}
                    {#if p.badges.certified}<span class="rs-tag rs-tag-gold">{t("Certifié Académie", "Academy certified")}</span>{/if}
                    {#if p.badges.insured}<span class="rs-tag rs-tag-grey">{t("Assuré", "Insured")}</span>{/if}
                    {#if p.next_slot}<span class="rs-tag rs-tag-slot">🕒 {slotText(p.next_slot)}</span>{/if}
                  </div>
                  {#if p.quote}<p class="rs-quote">« {p.quote} »</p>{/if}
                </div>

                <div class="rs-action">
                  {#if p.price_from}
                    <span class="rs-from">{t("Dès", "From")}</span>
                    <strong class="rs-price">{fmt(p.price_from)} FCFA</strong>
                  {:else}
                    <strong class="rs-price rs-price-quote">{t("Sur devis", "On quote")}</strong>
                  {/if}
                  <a class="rs-btn rs-btn-yellow" href={p.profile_url}>{t("Voir le profil", "View profile")}</a>
                  <a class="rs-btn rs-btn-outline" href={bookUrl(p)}>{t("Réserver", "Book")}</a>
                </div>
              </article>
            {/each}
          </div>
          {#if items.length < total}
            <div class="rs-more">
              <button type="button" class="rs-btn rs-btn-outline rs-inline" disabled={loadingMore} onclick={loadMore}>
                {loadingMore ? "…" : `${t("Voir plus de résultats", "Show more results")} (${total - items.length})`}
              </button>
            </div>
          {/if}
        {/if}
      </section>
    </div>
  </div>
</div>

<style>
  .rs {
    --rs-yellow: #ffc629;
    --rs-green: #0f7d41;
    --rs-green-deep: #0a5a2e;
    --rs-ink: #1b2620;
    --rs-ink-soft: #46524b;
    --rs-dark: #1d2621;
    --rs-cream: #fff4d1;
    --rs-cream-deep: #f3e5b5;
    --rs-line: #f1e6bf;
    --rs-font: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
    --rs-display: "Bricolage Grotesque", "Figtree", system-ui, sans-serif;

    font-family: var(--rs-font);
    color: var(--rs-ink);
    background: #fff;
    min-height: 100dvh;
    padding-bottom: 3rem;
  }
  .rs h1,
  .rs strong {
    color: inherit;
  }
  .rs p {
    margin: 0;
    color: inherit;
  }
  .rs a:hover {
    text-decoration: none;
  }
  .rs-wrap {
    width: min(1180px, 100% - clamp(2rem, 6vw, 6rem));
    margin-inline: auto;
  }

  /* ---------- Header ---------- */
  .rs-header {
    border-bottom: 1px solid var(--rs-line);
    padding: 0.75rem 0;
    background: #fff;
  }
  .rs-header-inner {
    display: flex;
    align-items: center;
    gap: 1.4rem;
  }
  .rs-search {
    flex: 1;
    min-width: 0;
    max-width: none;
    flex-direction: row;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1.5px solid var(--rs-ink);
    border-radius: 12px;
    padding: 0.3rem 0.35rem 0.3rem 1rem;
    background: #fff;
  }
  .rs-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    box-shadow: none;
    border-radius: 0;
    padding: 0.4rem 0;
    background: transparent;
    font: inherit;
    font-size: 0.92rem;
    color: var(--rs-ink);
  }
  .rs-search input:focus {
    border: 0;
    box-shadow: none;
  }
  .rs-search button {
    flex: none;
    border: 0;
    border-radius: 9px;
    background: var(--rs-yellow);
    color: var(--rs-ink);
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 0.55rem 1rem;
    cursor: pointer;
  }
  .rs-location {
    flex: none;
    border: 0;
    background: transparent;
    font: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--rs-ink);
    cursor: pointer;
    white-space: nowrap;
  }

  /* ---------- SITA ---------- */
  .rs-body {
    padding-top: 1.3rem;
  }
  .rs-sita {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    background: var(--rs-cream);
    border: 1px solid var(--rs-line);
    border-radius: 14px;
    padding: 0.9rem 1.2rem;
    font-size: 0.85rem;
  }
  .rs-sita-pill {
    flex: none;
    background: var(--rs-dark);
    color: #fff;
    border-radius: 999px;
    padding: 0.28rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .rs-sita p {
    flex: 1;
    line-height: 1.45;
  }
  .rs-sita-link {
    flex: none;
    color: var(--rs-green);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    white-space: nowrap;
  }
  .rs-sita-link:hover {
    text-decoration: underline !important;
  }

  /* ---------- Grille ---------- */
  .rs-grid {
    display: grid;
    grid-template-columns: 14.5rem minmax(0, 1fr);
    gap: 2.2rem;
    margin-top: 1.6rem;
    align-items: start;
  }

  /* ---------- Filtres ---------- */
  .rs-filters-toggle {
    display: none;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border: 1px solid var(--rs-line);
    background: #fff;
    border-radius: 12px;
    padding: 0.7rem 1rem;
    font: inherit;
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--rs-ink);
    cursor: pointer;
  }
  .rs-filters {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    font-size: 0.85rem;
  }
  .rs-filters fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .rs-filters legend {
    padding: 0;
    margin-bottom: 0.7rem;
    font-weight: 700;
    font-size: 0.88rem;
  }
  .rs-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .rs-pill {
    border: 1px solid var(--rs-line);
    background: #fff;
    border-radius: 999px;
    padding: 0.4rem 0.8rem;
    font: inherit;
    font-size: 0.72rem;
    color: var(--rs-ink);
    cursor: pointer;
  }
  .rs-pill.on {
    background: var(--rs-dark);
    border-color: var(--rs-dark);
    color: #fff;
  }

  .rs-check,
  .rs-radio {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    cursor: pointer;
    line-height: 1.3;
  }
  .rs-check input,
  .rs-radio input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    padding: 0;
    border: 0;
  }
  .rs-box {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    border: 1.5px solid #9aa39d;
    border-radius: 4px;
    background: #fff;
    display: grid;
    place-items: center;
  }
  .rs-check input:checked + .rs-box {
    background: var(--rs-green-deep);
    border-color: var(--rs-green-deep);
  }
  .rs-check input:checked + .rs-box::after {
    content: "✓";
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
  }
  .rs-dot {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    border: 1.5px solid #9aa39d;
    border-radius: 50%;
    background: #fff;
    display: grid;
    place-items: center;
  }
  .rs-radio input:checked + .rs-dot {
    border-color: var(--rs-green-deep);
    border-width: 5px;
    background: #fff;
  }
  .rs-check input:focus-visible + .rs-box,
  .rs-radio input:focus-visible + .rs-dot {
    outline: 2px solid var(--rs-green);
    outline-offset: 2px;
  }

  .rs-tip {
    background: var(--rs-cream);
    border-radius: 14px;
    padding: 1rem 1.1rem;
    font-size: 0.76rem;
    line-height: 1.5;
  }
  .rs-tip a {
    display: inline-block;
    margin-top: 0.4rem;
    color: var(--rs-ink);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .rs-tip a:hover {
    text-decoration: underline !important;
  }

  /* ---------- Résultats ---------- */
  .rs-results-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.1rem;
  }
  .rs-results-head h1 {
    font-family: var(--rs-display);
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .rs-results-head h1 span {
    font-family: var(--rs-font);
    font-weight: 400;
    font-size: 0.85rem;
    color: var(--rs-ink-soft);
  }
  .rs-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: none;
  }
  .rs-view,
  .rs-sort {
    border: 1px solid var(--rs-line);
    background: #fff;
    border-radius: 10px;
    padding: 0.5rem 0.9rem;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--rs-ink);
    cursor: pointer;
    white-space: nowrap;
  }
  .rs-sort {
    font-weight: 500;
  }
  .rs-view.on {
    background: var(--rs-dark);
    border-color: var(--rs-dark);
    color: #fff;
  }

  .rs-list {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .rs-card {
    display: grid;
    grid-template-columns: 9.4rem minmax(0, 1fr) 11.6rem;
    gap: 1.1rem;
    align-items: stretch;
    background: #fff;
    border: 1px solid var(--rs-line);
    border-radius: 18px;
    padding: 0.9rem;
  }
  .rs-photo {
    background: var(--rs-cream-deep);
    border-radius: 12px;
    display: grid;
    place-items: center;
    min-height: 7.9rem;
    font-size: 0.7rem;
    color: #6b6a55;
  }
  .rs-info {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-top: 0.2rem;
    min-width: 0;
  }
  .rs-name-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .rs-name-row strong {
    font-size: 0.95rem;
  }
  .rs-avatar {
    width: 2.3rem;
    height: 2.3rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.8rem;
  }
  .rs-tone-yellow {
    background: var(--rs-yellow);
  }
  .rs-tone-green {
    background: #dff1e5;
  }
  .rs-tone-grey {
    background: #ececef;
  }
  .rs-tone-gold {
    background: #ffe6a3;
  }
  .rs-top {
    background: var(--rs-dark);
    color: var(--rs-yellow);
    border-radius: 6px;
    padding: 0.22rem 0.5rem;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .rs-meta {
    font-size: 0.78rem;
    color: var(--rs-ink-soft);
  }
  .rs-star strong {
    color: var(--rs-ink);
  }
  .rs-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .rs-tag {
    border-radius: 999px;
    padding: 0.18rem 0.6rem;
    font-size: 0.64rem;
    font-weight: 700;
  }
  .rs-tag-green {
    background: #e2f3e8;
    color: var(--rs-green-deep);
  }
  .rs-tag-gold {
    background: #ffe9a8;
    color: #6b4f00;
  }
  .rs-tag-grey {
    background: #ececef;
    color: #3f444d;
  }
  .rs-quote {
    font-size: 0.82rem;
    color: var(--rs-ink-soft);
  }

  .rs-action {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.1rem;
  }
  .rs-from {
    font-size: 0.7rem;
    color: var(--rs-ink-soft);
    line-height: 1;
    margin-bottom: -0.3rem;
  }
  .rs-price {
    font-family: var(--rs-display);
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .rs-btn {
    display: block;
    text-align: center;
    text-decoration: none;
    border-radius: 12px;
    padding: 0.65rem 0.8rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px solid transparent;
    color: var(--rs-ink);
  }
  .rs-btn:hover {
    filter: brightness(0.96);
  }
  .rs-btn-yellow {
    background: var(--rs-yellow);
  }
  .rs-btn-outline {
    background: #fff;
    border-color: var(--rs-ink);
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 900px) {
    .rs-grid {
      grid-template-columns: 1fr;
      gap: 1.4rem;
    }
    .rs-filters-toggle {
      display: flex;
    }
    .rs-filters {
      display: none;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.2rem 1.5rem;
      margin-top: -0.4rem;
    }
    .rs-filters.open {
      display: grid;
    }
    .rs-tip {
      grid-column: 1 / -1;
    }
    .rs-sita {
      flex-wrap: wrap;
    }
    .rs-location {
      display: none;
    }
  }
  @media (max-width: 680px) {
    .rs-header-inner {
      flex-wrap: wrap;
      gap: 0.8rem;
    }
    .rs-search {
      order: 3;
      flex: 1 1 100%;
    }
    .rs-filters {
      grid-template-columns: 1fr;
    }
    .rs-results-head {
      flex-direction: column;
      align-items: flex-start;
    }
    .rs-card {
      grid-template-columns: 1fr;
    }
    .rs-photo {
      min-height: 5rem;
    }
    .rs-sita-link {
      white-space: normal;
    }
    .rs-sort {
      display: none;
    }
    .rs-action {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
    }
    .rs-from {
      grid-column: 1 / -1;
      margin-bottom: -0.5rem;
    }
    .rs-price {
      grid-column: 1 / -1;
    }
  }

  /* ---------- Ajouts (version dynamique) ---------- */
  .rs-loc {
    position: relative;
    flex: none;
  }
  .rs-loc-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    border: 0;
    z-index: 30;
    cursor: default;
  }
  .rs-loc-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.4rem);
    z-index: 31;
    min-width: 15rem;
    max-height: 22rem;
    overflow: auto;
    background: #fff;
    border: 1px solid var(--rs-line);
    border-radius: 14px;
    box-shadow: 0 16px 40px rgba(27, 38, 32, 0.18);
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
  }
  .rs-loc-menu button {
    text-align: left;
    border: 0;
    background: none;
    font: inherit;
    font-size: 0.85rem;
    padding: 0.5rem 0.7rem;
    border-radius: 8px;
    cursor: pointer;
    color: var(--rs-ink);
  }
  .rs-loc-menu button:hover {
    background: var(--rs-cream);
  }
  .rs-loc-city {
    font-weight: 700;
  }
  .rs-loc-empty {
    padding: 0.6rem 0.7rem;
    font-size: 0.82rem;
    color: var(--rs-ink-soft);
  }
  .rs-sort {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--rs-line);
    background: #fff;
    border-radius: 10px;
    padding: 0.1rem 0.5rem 0.1rem 0.8rem;
    font-size: 0.75rem;
  }
  .rs-sort select {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.4rem 0.2rem;
    box-shadow: none;
    cursor: pointer;
    color: var(--rs-ink);
  }
  .rs-sort select:focus {
    box-shadow: none;
    border: 0;
  }
  .rs-photo {
    position: relative;
    overflow: hidden;
    text-decoration: none;
    color: #6b6a55;
  }
  .rs-photo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rs-photo-initials {
    font-family: var(--rs-display);
    font-size: 2rem;
    font-weight: 800;
    opacity: 0.55;
  }
  .rs-name {
    color: inherit;
    text-decoration: none;
  }
  .rs-name:hover {
    text-decoration: underline !important;
  }
  .rs-tag-slot {
    background: #eef3ff;
    color: #2a3f7a;
  }
  .rs-price-quote {
    font-size: 1.05rem;
  }
  .rs-note {
    font-size: 0.74rem !important;
    color: var(--rs-ink-soft) !important;
  }
  .rs-reset {
    align-self: flex-start;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--rs-green);
    text-decoration: underline;
    cursor: pointer;
  }
  .rs-map {
    height: min(34rem, 70vh);
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid var(--rs-line);
    z-index: 0;
  }
  .rs-empty {
    background: var(--rs-cream);
    border-radius: 16px;
    padding: 1.4rem 1.5rem;
    font-size: 0.9rem;
  }
  .rs-empty p {
    margin: 0 0 0.4rem;
  }
  .rs-more {
    display: flex;
    justify-content: center;
    margin-top: 1.2rem;
  }
  .rs-inline {
    display: inline-block;
    padding-inline: 1.4rem;
  }
  .rs-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  @media (max-width: 680px) {
    .rs-sort-label {
      display: none;
    }
  }
</style>
