<script lang="ts">
  import "$lib/components/home/home.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { CatalogItem } from "$lib/api/directory";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  const TONES = ["yellow", "green", "gold", "grey"];
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const initials = (n: string) => {
    const w = n.replace(/&/g, " ").split(/\s+/).filter((x) => /^\p{L}/u.test(x));
    return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase();
  };

  type Row = CatalogItem & { key: string; letter: string; tone: string };
  // Pre-calcule une seule fois : la frappe ne fait ensuite que filtrer un tableau en memoire.
  let rows = $derived<Row[]>(
    (data.catalog?.items ?? []).map((c, i) => {
      const key = norm(`${c.name} ${c.description ?? ""}`);
      const first = norm(c.name).charAt(0).toUpperCase();
      return { ...c, key, letter: /[A-Z]/.test(first) ? first : "#", tone: TONES[i % TONES.length] };
    })
  );

  let q = $state($page.url.searchParams.get("q") ?? "");
  let sort = $state<"az" | "popular">("az");
  let letter = $state("");
  let onlyAvailable = $state(false);
  let broken = $state<Record<number, boolean>>({});
  let searchEl: HTMLInputElement | undefined = $state();

  let letters = $derived([...new Set(rows.map((r) => r.letter))].sort());
  let filtered = $derived.by(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    let out = rows.filter((r) => (!letter || r.letter === letter) && (!onlyAvailable || r.providers > 0) && terms.every((w) => r.key.includes(w)));
    if (sort === "popular") out = [...out].sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name));
    return out;
  });
  let popular = $derived([...rows].sort((a, b) => b.providers - a.providers).filter((r) => r.providers > 0).slice(0, 6));
  let totalProviders = $derived(rows.reduce((n, r) => n + r.providers, 0));

  // URL partageable, sans recharger la page ni perdre le focus.
  let timer: ReturnType<typeof setTimeout>;
  $effect(() => {
    const value = q.trim();
    clearTimeout(timer);
    timer = setTimeout(() => {
      const url = new URL($page.url);
      if (value) url.searchParams.set("q", value);
      else url.searchParams.delete("q");
      if (url.search !== $page.url.search) goto(url, { replaceState: true, keepFocus: true, noScroll: true });
    }, 350);
    return () => clearTimeout(timer);
  });

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
      searchEl?.focus();
    }
  }
  const href = (r: CatalogItem) => `/recherche?q=${encodeURIComponent(r.name)}`;
  function reset() {
    q = "";
    letter = "";
    onlyAvailable = false;
  }
</script>

<svelte:window onkeydown={onKey} />

<Seo
  title={t("Toutes les catégories de services", "All service categories")}
  description={t("Parcourez tous les métiers et services Trankyl : plomberie, électricité, ménage, garde d'enfants et plus. Prestataires vérifiés près de chez vous.", "Browse every Trankyl trade and service with verified providers near you.")}
/>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="ac cat">
  <section class="cat-hero">
    <div class="ac-wrap">
      <nav class="cat-crumbs" aria-label="Fil d'Ariane">
        <a href="/accueil">{t("Accueil", "Home")}</a><span>›</span><span>{t("Catégories", "Categories")}</span>
      </nav>
      <h1>{t("Tous les services, un seul endroit", "Every service, one place")}</h1>
      <p class="cat-lead">
        {t("Trouvez le bon professionnel vérifié parmi", "Find the right verified professional among")}
        <strong>{rows.length}</strong> {t("métiers", "trades")}{#if totalProviders > 0}{t(" et ", " and ")}<strong>{totalProviders}</strong> {t("prestations disponibles", "services available")}{/if}.
      </p>

      <form class="cat-search" role="search" onsubmit={(e) => { e.preventDefault(); if (!filtered.length && q.trim()) goto(`/recherche?q=${encodeURIComponent(q.trim())}`); else if (filtered.length === 1) goto(href(filtered[0])); }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          bind:this={searchEl}
          bind:value={q}
          type="search"
          autocomplete="off"
          placeholder={t("Rechercher un métier : plombier, ménage, coiffure…", "Search a trade: plumber, cleaning, hair…")}
          aria-label={t("Rechercher une catégorie", "Search a category")}
        />
        {#if q}<button type="button" class="cat-clear" aria-label={t("Effacer", "Clear")} onclick={() => { q = ""; searchEl?.focus(); }}>×</button>{:else}<kbd>/</kbd>{/if}
      </form>

      {#if popular.length}
        <div class="cat-popular">
          <span>{t("Populaires :", "Popular:")}</span>
          {#each popular as p}
            <button type="button" class:on={norm(q) === norm(p.name)} onclick={() => (q = p.name)}>{p.name}</button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <section class="cat-body">
    <div class="ac-wrap">
      {#if data.error}
        <p class="cat-empty">{data.error}</p>
      {:else}
        <div class="cat-toolbar">
          <p class="cat-count" aria-live="polite">
            <strong>{filtered.length}</strong> {t(filtered.length > 1 ? "catégories" : "catégorie", filtered.length > 1 ? "categories" : "category")}
            {#if q.trim()}{t("pour", "for")} « {q.trim()} »{/if}
          </p>
          <div class="cat-controls">
            <label class="cat-check"><input type="checkbox" bind:checked={onlyAvailable} /> {t("Avec prestataires", "With providers")}</label>
            <div class="cat-seg" role="group" aria-label={t("Trier", "Sort")}>
              <button type="button" class:on={sort === "az"} onclick={() => (sort = "az")}>A–Z</button>
              <button type="button" class:on={sort === "popular"} onclick={() => (sort = "popular")}>{t("Populaires", "Popular")}</button>
            </div>
          </div>
        </div>

        {#if letters.length > 6}
          <div class="cat-letters" role="group" aria-label={t("Filtrer par lettre", "Filter by letter")}>
            <button type="button" class:on={!letter} onclick={() => (letter = "")}>{t("Tous", "All")}</button>
            {#each letters as l}
              <button type="button" class:on={letter === l} onclick={() => (letter = letter === l ? "" : l)}>{l}</button>
            {/each}
          </div>
        {/if}

        {#if filtered.length}
          <div class="cat-grid">
            {#each filtered as r (r.id)}
              <a class="cat-card" href={href(r)} data-sveltekit-preload-data="hover">
                <span class="cat-thumb ac-tone-{r.tone}">
                  {#if r.image_url && !broken[r.id]}<img src={r.image_url} alt="" loading="lazy" decoding="async" onerror={() => (broken[r.id] = true)} />{:else}<b>{initials(r.name)}</b>{/if}
                </span>
                <span class="cat-text">
                  <strong>{r.name}</strong>
                  {#if r.description}<span class="cat-desc">{r.description}</span>{/if}
                  <span class="cat-meta" class:none={!r.providers}>
                    {#if r.providers}<i></i>{r.providers} {t(r.providers > 1 ? "prestataires" : "prestataire", r.providers > 1 ? "providers" : "provider")}{:else}{t("Bientôt disponible", "Coming soon")}{/if}
                  </span>
                </span>
                <span class="cat-go" aria-hidden="true">→</span>
              </a>
            {/each}
          </div>
        {:else}
          <div class="cat-empty">
            <strong>{t("Aucune catégorie ne correspond.", "No category matches.")}</strong>
            <p>{t("Décrivez votre besoin, notre recherche intelligente trouvera le bon prestataire.", "Describe your need and our smart search will find the right provider.")}</p>
            <div class="cat-empty-actions">
              {#if q.trim()}<a class="cat-btn" href={`/recherche?q=${encodeURIComponent(q.trim())}`}>{t("Rechercher « " + q.trim() + " »", "Search “" + q.trim() + "”")}</a>{/if}
              <button type="button" class="cat-btn ghost" onclick={reset}>{t("Réinitialiser", "Reset")}</button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </section>

</div>

<style>
  .cat { padding-bottom: 0; }
  .cat-hero { background: var(--ac-yellow); padding: 2.2rem 0 2.6rem; border-radius: 0 0 36px 36px; }
  .cat-crumbs { display: flex; gap: .5rem; font-size: .82rem; color: var(--ac-ink-soft); margin-bottom: 1.2rem; }
  .cat-crumbs a { color: inherit; text-decoration: none; font-weight: 600; }
  .cat-crumbs a:hover { text-decoration: underline; }
  .cat h1 { font-size: clamp(2rem, 4.4vw, 3.2rem); font-weight: 800; line-height: 1.08; max-width: 18ch; letter-spacing: -.02em; }
  .cat-lead { margin: .9rem 0 1.6rem; font-size: 1.05rem; color: var(--ac-ink); max-width: 56ch; }

  .cat .cat-search { display: flex; flex-direction: row; width: 100%; align-items: center; gap: .7rem; background: #fff; border: 2px solid var(--ac-ink); border-radius: 18px; padding: .35rem .6rem .35rem 1.1rem; max-width: 680px; box-sizing: border-box; box-shadow: 0 10px 28px rgba(27,38,32,.14); transition: box-shadow .15s; }
  .cat-search:focus-within { box-shadow: 0 0 0 4px rgba(15,125,65,.28), 0 10px 28px rgba(27,38,32,.14); }
  .cat .cat-search svg { color: var(--ac-ink-soft); flex: none; }
  .cat .cat-search input { flex: 1 1 auto; width: auto; min-width: 0; min-height: 0; border: 0 !important; outline: 0; box-shadow: none !important; border-radius: 0; background: transparent !important; font: inherit; font-size: 1.02rem; padding: .85rem 0; color: var(--ac-ink); }
  .cat-search input::-webkit-search-cancel-button { display: none; }
  .cat .cat-search kbd { font: 600 .75rem var(--ac-font); border: 1px solid var(--ac-line); border-radius: 6px; padding: .15rem .45rem; color: var(--ac-ink-soft); background: #faf6e6; }
  .cat-clear { border: 0; background: var(--ac-cream); width: 2rem; height: 2rem; border-radius: 50%; font-size: 1.2rem; line-height: 1; cursor: pointer; color: var(--ac-ink); }

  .cat-popular { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1rem; font-size: .85rem; }
  .cat-popular span { font-weight: 700; }
  .cat-popular button { border: 0; background: #fff; border-radius: 999px; padding: .4rem .9rem; font: 500 .84rem var(--ac-font); cursor: pointer; color: var(--ac-ink); transition: transform .12s, background .12s; }
  .cat-popular button:hover { transform: translateY(-1px); }
  .cat-popular button.on { background: var(--ac-ink); color: #fff; }

  .cat-body { padding: 2.4rem 0 4.5rem; }
  .cat-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .8rem 1.5rem; margin-bottom: 1rem; }
  .cat-count { margin: 0; color: var(--ac-ink-soft); }
  .cat-count strong { color: var(--ac-ink); font-size: 1.1rem; }
  .cat-controls { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; }
  .cat-check { display: inline-flex; align-items: center; gap: .45rem; font-size: .88rem; cursor: pointer; accent-color: var(--ac-green); }
  .cat-seg { display: inline-flex; background: #f4f1e4; border-radius: 12px; padding: 3px; }
  .cat-seg button { border: 0; background: transparent; padding: .45rem .95rem; border-radius: 9px; font: 600 .84rem var(--ac-font); cursor: pointer; color: var(--ac-ink-soft); }
  .cat-seg button.on { background: #fff; color: var(--ac-ink); box-shadow: 0 1px 4px rgba(27,38,32,.15); }

  .cat-letters { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: 1.4rem; }
  .cat-letters button { min-width: 2.1rem; height: 2.1rem; padding: 0 .6rem; border: 1px solid var(--ac-line); background: #fff; border-radius: 10px; font: 700 .8rem var(--ac-font); cursor: pointer; color: var(--ac-ink-soft); }
  .cat-letters button:hover { border-color: var(--ac-green); color: var(--ac-green); }
  .cat-letters button.on { background: var(--ac-green); border-color: var(--ac-green); color: #fff; }

  .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .cat-card { position: relative; display: flex; align-items: center; gap: 1rem; background: #fff; border: 1px solid var(--ac-line); border-radius: 18px; padding: .9rem 1rem; text-decoration: none; color: var(--ac-ink); transition: transform .15s, box-shadow .15s, border-color .15s; }
  .cat-card:hover, .cat-card:focus-visible { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(27,38,32,.12); border-color: var(--ac-green); outline: 0; }
  .cat-thumb { flex: none; width: 3.6rem; height: 3.6rem; border-radius: 14px; overflow: hidden; display: grid; place-items: center; font-size: 1.05rem; }
  .cat-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .cat-text { display: flex; flex-direction: column; gap: .15rem; min-width: 0; flex: 1; }
  .cat-text strong { font-size: .98rem; }
  .cat-desc { font-size: .78rem; color: var(--ac-ink-soft); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .cat-meta { display: inline-flex; align-items: center; gap: .4rem; font-size: .76rem; font-weight: 700; color: var(--ac-green); margin-top: .2rem; }
  .cat-meta i { width: .45rem; height: .45rem; border-radius: 50%; background: var(--ac-green); }
  .cat-meta.none { color: var(--ac-ink-soft); font-weight: 500; }
  .cat-go { flex: none; color: var(--ac-green); font-weight: 800; opacity: 0; transform: translateX(-6px); transition: .15s; }
  .cat-card:hover .cat-go, .cat-card:focus-visible .cat-go { opacity: 1; transform: none; }

  .cat-empty { text-align: center; padding: 3.5rem 1rem; background: #fff; border: 1px dashed var(--ac-cream-deep); border-radius: 20px; }
  .cat-empty p { color: var(--ac-ink-soft); margin: .5rem 0 1.2rem; }
  .cat-empty-actions { display: flex; gap: .7rem; justify-content: center; flex-wrap: wrap; }

  .cat-btn { display: inline-flex; align-items: center; gap: .4rem; background: var(--ac-yellow); color: var(--ac-ink); font: 700 .92rem var(--ac-font); padding: .8rem 1.4rem; border-radius: 12px; text-decoration: none; border: 2px solid var(--ac-yellow); cursor: pointer; white-space: nowrap; }
  .cat-btn:hover { filter: brightness(.96); }
  .cat-btn.ghost { background: transparent; border-color: var(--ac-ink); }


  @media (max-width: 640px) {
    .cat-hero { border-radius: 0 0 24px 24px; padding-top: 1.4rem; }
    .cat-grid { grid-template-columns: 1fr; }
    .cat-go { opacity: 1; transform: none; }
    .cat .cat-search kbd { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .cat-card, .cat-go, .cat-popular button { transition: none; } }
</style>
