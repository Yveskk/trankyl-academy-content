<script lang="ts">
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import Check from "@lucide/svelte/icons/check";
  import { getProviderProfile, type ProviderProfile } from "$lib/api/directory";
  import QuoteModal from "$lib/components/QuoteModal.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "$lib/utils/leaflet";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  // Profil dans la langue active : la page est chargee dans la langue du moment ;
  // si le visiteur en change ensuite, on redemande le profil traduit (une seule fois par langue).
  let translated = $state<{ lang: string; slug: string; profile: ProviderProfile } | null>(null);
  let profile = $derived(
    translated && translated.slug === data.profile.slug && translated.lang === i18n.locale ? translated.profile : data.profile
  );
  $effect(() => {
    const lang = i18n.locale;
    const slug = data.profile.slug;
    if (lang === data.lang) return;
    if (untrack(() => translated && translated.lang === lang && translated.slug === slug)) return;
    let cancelled = false;
    getProviderProfile(slug, lang)
      .then((fresh) => {
        if (!cancelled) translated = { lang, slug, profile: fresh };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  let avatarBroken = $state(false);
  let p = $derived(profile);
  let firstName = $derived(p.short_name.split(" ")[0]);
  let fmt = (n: number) => n.toLocaleString(en ? "en-US" : "fr-FR").replace(/ | /g, " ");
  let rate = (n: number | null) => (n == null ? "—" : n.toLocaleString(en ? "en-US" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const monthYear = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(en ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }) : "");
  const dateRel = (iso: string | null) => {
    if (!iso) return "";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    const rtf = new Intl.RelativeTimeFormat(en ? "en" : "fr", { numeric: "auto" });
    if (days < 1) return rtf.format(0, "day");
    if (days < 14) return rtf.format(-days, "day");
    if (days < 60) return rtf.format(-Math.round(days / 7), "week");
    return rtf.format(-Math.round(days / 30), "month");
  };

  const CRITERIA: Record<string, { fr: string; en: string }> = {
    punctuality: { fr: "Ponctualité", en: "Punctuality" },
    quality: { fr: "Qualité du travail", en: "Work quality" },
    cleanliness: { fr: "Propreté", en: "Cleanliness" },
    price: { fr: "Respect du prix", en: "Price respect" },
  };

  // ------------------------------------------------------------ reservation
  let slotIndex = $state(0);

  // Service choisi : celui qu'on reserve. Aucun par defaut : sans choix, "Reserver" invite a en selectionner un ;
  // un service "sur devis" ne se reserve pas.
  let selectedId = $state<number | null>(null);
  $effect(() => {
    if (selectedId !== null && !profile.services.some((s) => s.id === selectedId)) selectedId = null;
  });
  let selectedService = $derived(profile.services.find((s) => s.id === selectedId) ?? null);
  let canBook = $derived(!!selectedService?.price);

  /** Page de reservation : le service et le creneau choisis ici y sont deja selectionnes. */
  function book() {
    if (!selectedService) {
      snackbar.error(t("Sélectionnez d'abord le service que vous souhaitez réserver.", "Please select the service you want to book first."));
      document.querySelector(".pf-table")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!canBook) {
      snackbar.error(t("Ce service est sur devis : demandez un devis pour le réserver.", "This service is on quote: request a quote to book it."));
      return;
    }
    const q = new URLSearchParams({ service: String(selectedService.id) });
    const iso = p.booking.slots[slotIndex]?.iso;
    if (iso) q.set("slot", iso);
    goto(`/profil/${p.slug}/reserver?${q}`);
  }
  let selectedSlot = $derived(p.booking.slots[slotIndex]?.label ?? null);
  let modal = $state<{ open: boolean; mode: "quote" | "message" }>({ open: false, mode: "quote" });

  // ------------------------------------------------------------ partage
  let shareDisplay = $derived(p.share.url.replace(/^https?:\/\//, ""));
  let copied = $state(false);
  let qrUrl = $state<string | null>(null);

  // navigator.clipboard n'existe qu'en contexte securise (https / localhost) : repli sur une zone de texte temporaire.
  async function writeClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* repli ci-dessous */
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("copy");
  }

  async function copyLink() {
    try {
      await writeClipboard(p.share.url);
      copied = true;
      snackbar.success(t("Lien copié.", "Link copied."));
      setTimeout(() => (copied = false), 1800);
    } catch {
      copied = false;
      snackbar.error(t("Impossible de copier le lien.", "Unable to copy the link."));
    }
  }
  // Feuille de partage du telephone (TikTok, Instagram, Messenger...) : seulement la ou le navigateur la propose.
  let canNativeShare = $state(false);
  $effect(() => {
    canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  });
  async function nativeShare() {
    try {
      await navigator.share({ title: `${p.name} — Trankyl`, url: p.share.url });
    } catch {
      // annule par l'utilisateur
    }
  }
  const facebookUrl = $derived(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(p.share.url)}`);

  // QR code genere dans le navigateur (charge a la demande, jamais bloquant)
  $effect(() => {
    const url = p.share.url;
    let cancelled = false;
    (async () => {
      try {
        const qrModule = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
        const mod: any = await import(/* @vite-ignore */ qrModule);
        const lib = mod.default ?? mod;
        const dataUrl: string = await lib.toDataURL(url, { margin: 1, width: 240 });
        if (!cancelled) qrUrl = dataUrl;
      } catch {
        if (!cancelled) qrUrl = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  // ------------------------------------------------------------ zone d'intervention
  const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  const mapsUrl = $derived(p.zone.lat != null && p.zone.lng != null ? `https://www.google.com/maps/search/?api=1&query=${p.zone.lat},${p.zone.lng}` : "");
  let zoneEl = $state<HTMLDivElement | undefined>();
  $effect(() => {
    if (!zoneEl || p.zone.lat == null || p.zone.lng == null) return;
    const { lat, lng, radius_km } = p.zone;
    let map: any;
    let ro: ResizeObserver | undefined;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !zoneEl) return;
        // Carte interactive : glisser, boutons +/-, pincement sur mobile. La molette ne zoome qu'apres un clic sur la carte
        // (sinon elle bloquerait le defilement de la page).
        map = L.map(zoneEl, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], 12);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        map.on("focus", () => map.scrollWheelZoom.enable());
        map.on("blur", () => map.scrollWheelZoom.disable());
        const marker = L.marker([lat, lng]).addTo(map);
        if (p.city || p.zone.label) marker.bindPopup(escapeHtml(p.zone.label || p.city || ""));
        if (radius_km) {
          const circle = L.circle([lat, lng], { radius: radius_km * 1000, color: "#0f7d41", fillColor: "#0f7d41", fillOpacity: 0.12 }).addTo(map);
          map.fitBounds(circle.getBounds(), { padding: [10, 10] });
        }
        // Le conteneur peut encore etre en cours de mise en page au chargement : on recalcule la taille pour des tuiles completes.
        setTimeout(() => map?.invalidateSize(), 150);
        ro = new ResizeObserver(() => map?.invalidateSize());
        ro.observe(zoneEl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
    };
  });

  let headline = $derived(
    [p.job ?? p.headline, p.city ? `${p.city}${p.districts.length ? ` (${p.districts.join(", ")})` : ""}` : null, p.member_since ? `${t("membre depuis", "member since")} ${p.member_since}` : null]
      .filter(Boolean)
      .join(" · ")
  );
</script>

<Seo title={`${p.name}${p.job ? ` — ${p.job}` : ""}`} description={`${t("Profil vérifié de", "Verified profile of")} ${p.name}${p.city ? `, ${p.city}` : ""} : ${t("services, prix indicatifs et avis clients.", "services, indicative prices and customer reviews.")}`} image={p.cover_image_url ?? p.image_url ?? undefined} />

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="pf">
  <div class="pf-cover" style={p.cover_image_url ? `background-image: url('${p.cover_image_url}')` : ""}></div>

  <div class="pf-wrap pf-grid">
    <!-- En-tête + stats -->
    <div class="pf-head">
      <div class="pf-id">
        {#if p.image_url && !avatarBroken}
          <img class="pf-avatar pf-avatar-img" src={p.image_url} alt={p.name} onerror={() => (avatarBroken = true)} />
        {:else}
          <span class="pf-avatar">{p.initials}</span>
        {/if}
        <div class="pf-id-text">
          <h1>{p.name}</h1>
          <p>{headline}</p>
        </div>
      </div>

      <div class="pf-badges">
        {#if p.badges.identity}<span class="pf-badge pf-badge-green">✓ {t("Identité vérifiée", "Identity verified")}</span>{/if}
        {#if p.badges.address}<span class="pf-badge pf-badge-green">✓ {t("Adresse vérifiée", "Address verified")}</span>{/if}
        {#each p.badges.certified as c}<span class="pf-badge pf-badge-gold">{t("Certifié Académie", "Academy certified")} · {c}</span>{/each}
        {#if p.badges.insured}<span class="pf-badge pf-badge-grey">{t("Assuré dommages", "Damage insured")}</span>{/if}
        {#if p.badges.top}<span class="pf-badge pf-badge-dark">{t("TOP PRESTATAIRE", "TOP PROVIDER")} {p.badges.top_year}</span>{/if}
      </div>

      <div class="pf-stats">
        <div><strong>★ {rate(p.stats.rating)}</strong><span>{p.stats.reviews_count} {t("avis vérifiés", "verified reviews")}</span></div>
        <div><strong>{fmt(p.stats.missions)}</strong><span>{t("missions réalisées", "jobs completed")}</span></div>
        {#if p.stats.response_minutes}<div><strong>{p.stats.response_minutes} min</strong><span>{t("temps de réponse", "response time")}</span></div>{/if}
        {#if p.stats.on_time_rate != null}<div><strong>{Math.round(p.stats.on_time_rate)} %</strong><span>{t("missions à l'heure", "jobs on time")}</span></div>{/if}
      </div>
    </div>

    <!-- Colonne latérale -->
    <aside class="pf-side">
      <div class="pf-book">
        {#if selectedService?.price}
          <span class="pf-muted">{selectedService.title}</span>
          <strong class="pf-book-price">{t("dès", "from")} {fmt(selectedService.price)} FCFA</strong>
        {:else if p.booking.visit_fee}
          <span class="pf-muted">{t("Déplacement + diagnostic dès", "Visit + diagnosis from")}</span>
          <strong class="pf-book-price">{fmt(p.booking.visit_fee)} FCFA</strong>
        {:else}
          <strong class="pf-book-price pf-book-quote">{t("Sur devis", "On quote")}</strong>
        {/if}

        {#if p.booking.slots.length > 0}
          <h3>{t("Disponibilités", "Availability")}</h3>
          <div class="pf-slots">
            {#each p.booking.slots as s, i}
              {@const [day, hour] = s.label.split("|")}
              <button type="button" class="pf-slot" class:on={slotIndex === i} aria-pressed={slotIndex === i} onclick={() => (slotIndex = i)}>
                <span>{day}</span><span>{hour}</span>
              </button>
            {/each}
          </div>
        {/if}

        <button type="button" class="pf-btn pf-btn-yellow pf-mt" onclick={() => (modal = { open: true, mode: "quote" })}>{t("Demander un devis", "Request a quote")}</button>
        <button type="button" class="pf-btn pf-btn-dark" onclick={book}>{t("Réserver", "Book")}</button>

        <p class="pf-fine">{t("Paiement protégé · Garantie Trankyl · Assurance dommages en option. Restez sur Trankyl pour être couvert.", "Protected payment · Trankyl guarantee · Optional damage insurance. Stay on Trankyl to be covered.")}</p>
      </div>

      <div class="pf-share">
        <h3>{t("Partager ce profil", "Share this profile")}</h3>
        <div class="pf-copy">
          <span>{shareDisplay}</span>
          <button type="button" onclick={copyLink}>{copied ? t("Copié", "Copied") : t("Copier", "Copy")}</button>
        </div>
        <div class="pf-share-row">
          <div class="pf-qr">
            {#if qrUrl}<img src={qrUrl} alt="QR code" />{:else}<span>QR</span>{/if}
          </div>
          <div class="pf-share-btns">
            <a class="pf-btn pf-btn-yellow" href="https://wa.me/?text={encodeURIComponent(`${p.name} — ${p.share.url}`)}" target="_blank" rel="noopener">WhatsApp</a>
            <a class="pf-btn pf-btn-outline" href={facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>
            {#if canNativeShare}<button type="button" class="pf-btn pf-btn-outline" onclick={nativeShare}>{t("Autres applications", "More apps")}</button>{/if}
          </div>
        </div>
        <p class="pf-fine">{t("QR à imprimer sur la carte de visite et le véhicule.", "QR to print on your business card and vehicle.")}</p>
      </div>

      {#if p.zone.lat != null && p.zone.lng != null}
        <div class="pf-zone">
          <h3>{t("Zone d'intervention", "Service area")}</h3>
          <div class="pf-map" bind:this={zoneEl}></div>
          {#if p.zone.label}<p class="pf-fine pf-zone-label">{p.zone.label}</p>{/if}
          <a class="pf-maplink" href={mapsUrl} target="_blank" rel="noopener noreferrer">{t("Ouvrir dans Google Maps", "Open in Google Maps")} →</a>
        </div>
      {/if}
    </aside>

    <!-- Contenu principal -->
    <div class="pf-main">
      {#if p.about}
        <section>
          <h2>{t("À propos", "About")}</h2>
          <p class="pf-about">{p.about}</p>
          {#if p.languages.length}<p class="pf-langs">{t("Langues", "Languages")} : {p.languages.join(", ")}</p>{/if}
        </section>
      {/if}

      {#if p.services.length > 0}
        <section>
          <h2>{t("Services et prix indicatifs", "Services and indicative prices")}</h2>
          <div class="pf-table" role="radiogroup" aria-label={t("Choisir le service à réserver", "Choose the service to book")}>
            {#each p.services as s (s.id)}
              <button type="button" class="pf-row" class:sel={selectedId === s.id} role="radio" aria-checked={selectedId === s.id} onclick={() => (selectedId = s.id)}>
                <span class="pf-radio" aria-hidden="true">{#if selectedId === s.id}<Check size={13} />{/if}</span>
                <div><strong>{s.title}</strong>{#if s.subtitle}<span>{s.subtitle}</span>{/if}</div>
                <strong class="pf-row-price">{s.price ? `${t("dès", "from")} ${fmt(s.price)} FCFA` : t("Sur devis", "On quote")}</strong>
              </button>
            {/each}
            {#if p.services_note}<p class="pf-table-note">{p.services_note}</p>{/if}
          </div>
        </section>
      {/if}

      {#if p.media.length > 0}
        <section>
          <h2>{t("Réalisations", "Portfolio")}</h2>
          <div class="pf-works">
            {#each p.media as m}
              {#if m.kind === "video"}
                <a class="pf-work" href={m.url} target="_blank" rel="noopener">▶ {m.caption ?? "Vidéo"}</a>
              {:else}
                <a class="pf-work pf-work-img" href={m.url} target="_blank" rel="noopener" title={m.caption ?? ""}>
                  <img src={m.thumb_url ?? m.url} alt={m.caption ?? ""} loading="lazy" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                  {#if m.kind === "before_after"}<span class="pf-work-tag">{t("Avant / après", "Before / after")}</span>{/if}
                </a>
              {/if}
            {/each}
          </div>
        </section>
      {/if}

      {#if p.trainings.length > 0}
        <section>
          <h2>{t("Formations et certificats", "Training and certificates")}</h2>
          <div class="pf-trainings">
            {#each p.trainings as tr}
              <div class="pf-training">
                <span class="pf-training-ico">TA</span>
                <div><strong>{tr.title}</strong><span>Trankyl {t("Académie", "Academy")}{tr.delivered_at ? ` · ${monthYear(tr.delivered_at)}` : ""}</span></div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <section>
        <h2>{t("Avis clients", "Customer reviews")}</h2>
        {#if p.reviews.count === 0}
          <p class="pf-muted pf-empty">{t("Pas encore d'avis vérifié pour ce prestataire.", "No verified reviews for this provider yet.")}</p>
        {:else}
          <div class="pf-score">
            <div class="pf-score-main">
              <strong>{rate(p.reviews.average)}</strong>
              <span class="pf-stars" aria-hidden="true">★★★★★</span>
              <span class="pf-muted">{p.reviews.count} {t("avis", "reviews")}</span>
            </div>
            {#if p.reviews.criteria.length}
              <div class="pf-criteria">
                {#each p.reviews.criteria as c}
                  <span>{CRITERIA[c.key] ? (en ? CRITERIA[c.key].en : CRITERIA[c.key].fr) : c.key} <strong>{rate(c.value)}</strong></span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="pf-reviews">
            {#each p.reviews.items as r}
              <article class="pf-review">
                <div class="pf-review-head">
                  <strong>{r.author}</strong>
                  <span class="pf-stars" aria-label="{r.rating}/5">{"★".repeat(r.rating)}</span>
                  {#if r.verified}<span class="pf-paid">{t("Mission payée via Trankyl", "Job paid via Trankyl")}</span>{/if}
                  <span class="pf-muted">{dateRel(r.created_at)}</span>
                </div>
                {#if r.comment}<p>{r.comment}</p>{/if}
                {#if r.reply}<p class="pf-reply"><strong>{t("Réponse de", "Reply from")} {firstName} :</strong> {r.reply}</p>{/if}
              </article>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>

<QuoteModal bind:open={modal.open} vendorId={p.vendor_id} vendorName={firstName} mode={modal.mode} slotLabel={modal.mode === "quote" ? selectedSlot : null} />

<style>
  .pf {
    --pf-yellow: #ffc629;
    --pf-green: #0f7d41;
    --pf-green-deep: #0a5a2e;
    --pf-ink: #1b2620;
    --pf-ink-soft: #46524b;
    --pf-dark: #1d2621;
    --pf-cream: #fff4d1;
    --pf-cream-deep: #f3e5b5;
    --pf-line: #f1e6bf;
    --pf-font: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
    --pf-display: "Bricolage Grotesque", "Figtree", system-ui, sans-serif;

    font-family: var(--pf-font);
    color: var(--pf-ink);
    background: #fff;
    padding-bottom: 4rem;
  }
  .pf h1,
  .pf h2,
  .pf h3 {
    font-family: var(--pf-display);
    color: var(--pf-ink);
    letter-spacing: -0.02em;
    margin: 0;
  }
  .pf p {
    margin: 0;
    color: inherit;
  }
  .pf strong {
    color: inherit;
  }
  .pf a:hover {
    text-decoration: none;
  }
  .pf-muted {
    color: var(--pf-ink-soft);
    font-size: 0.78rem;
  }

  .pf-cover {
    height: 11.5rem;
    background: var(--pf-yellow);
    display: grid;
    place-items: center;
    font-size: 0.78rem;
    color: #6b4f00;
    text-align: center;
    padding: 0 1rem;
  }
  .pf-wrap {
    width: min(1180px, 100% - clamp(2rem, 6vw, 6rem));
    margin-inline: auto;
  }

  /* DOM : head, side, main. Bureau : head+main à gauche, side à droite. */
  .pf-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 21.5rem;
    grid-template-areas:
      "head side"
      "main side";
    column-gap: 2.4rem;
    align-items: start;
  }
  .pf-head {
    grid-area: head;
  }
  .pf-side {
    grid-area: side;
    margin-top: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .pf-main {
    grid-area: main;
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
    margin-top: 2.2rem;
  }

  /* ---------- En-tête ---------- */
  .pf-id {
    display: flex;
    align-items: flex-start;
    gap: 1.2rem;
  }
  .pf-avatar {
    flex: none;
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    background: var(--pf-green);
    color: #fff;
    border: 5px solid #fff;
    display: grid;
    place-items: center;
    font-family: var(--pf-display);
    font-weight: 800;
    font-size: 2.2rem;
    margin-top: -3.4rem;
  }
  .pf-id-text {
    padding-top: 0.9rem;
    min-width: 0;
  }
  .pf-id-text h1 {
    font-size: clamp(1.7rem, 3vw, 2.2rem);
    font-weight: 800;
  }
  .pf-id-text p {
    margin-top: 0.3rem;
    color: var(--pf-ink-soft);
    font-size: 0.92rem;
  }

  .pf-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.1rem;
  }
  .pf-badge {
    border-radius: 999px;
    padding: 0.28rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .pf-badge-green {
    background: #e2f3e8;
    color: var(--pf-green-deep);
  }
  .pf-badge-gold {
    background: #ffe9a8;
    color: #6b4f00;
  }
  .pf-badge-grey {
    background: #ececef;
    color: #3f444d;
  }
  .pf-badge-dark {
    background: var(--pf-dark);
    color: var(--pf-yellow);
  }

  .pf-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1.4rem;
  }
  .pf-stats > div {
    background: var(--pf-cream);
    border-radius: 16px;
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
  }
  .pf-stats strong {
    font-family: var(--pf-display);
    font-size: 1.45rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .pf-stats span {
    font-size: 0.74rem;
    color: var(--pf-ink-soft);
  }

  /* ---------- Sections ---------- */
  .pf-main h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.9rem;
  }
  .pf-about {
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .pf-table {
    border: 1px solid var(--pf-line);
    border-radius: 16px;
    overflow: hidden;
  }
  .pf-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    width: 100%;
    padding: 0.8rem 1rem;
    border: 0;
    border-bottom: 1px solid var(--pf-line);
    background: #fff;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
  }
  .pf-row:hover {
    background: #fffbea;
  }
  .pf-row.sel {
    background: #fff7d6;
    box-shadow: inset 4px 0 0 var(--pf-yellow);
  }
  .pf-row:focus-visible {
    outline: 2px solid var(--pf-ink);
    outline-offset: -2px;
  }
  .pf-radio {
    flex: none;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    margin-top: 0.1rem;
    border-radius: 50%;
    border: 2px solid #c9c9c1;
    background: #fff;
    color: #fff;
    transition: all 0.15s;
  }
  .pf-row.sel .pf-radio {
    border-color: var(--pf-ink);
    background: var(--pf-ink);
  }
  .pf-row > div {
    flex: 1;
  }
  .pf-row > div {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .pf-row strong {
    font-size: 0.88rem;
  }
  .pf-row span {
    font-size: 0.74rem;
    color: var(--pf-ink-soft);
  }
  .pf-row-price {
    white-space: nowrap;
  }
  .pf-table-note {
    background: var(--pf-cream);
    padding: 0.7rem 1rem;
    font-size: 0.74rem;
    color: var(--pf-ink-soft);
  }

  .pf-works {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }
  .pf-work {
    aspect-ratio: 1;
    border-radius: 20px;
    background: var(--pf-cream-deep);
    display: grid;
    place-items: center;
    font-size: 0.74rem;
    color: #6b6a55;
    text-align: center;
  }

  .pf-trainings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .pf-training {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    border: 1px solid var(--pf-line);
    border-radius: 16px;
    padding: 0.9rem 1rem;
  }
  .pf-training > div {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .pf-training strong {
    font-size: 0.9rem;
  }
  .pf-training span:not(.pf-training-ico) {
    font-size: 0.74rem;
    color: var(--pf-ink-soft);
  }
  .pf-training-ico {
    flex: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 10px;
    background: #ffe6a3;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 0.8rem;
    color: #6b4f00;
  }

  .pf-score {
    display: flex;
    align-items: center;
    gap: 2rem;
    background: var(--pf-cream);
    border-radius: 18px;
    padding: 1.1rem 1.4rem;
  }
  .pf-score-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.25;
  }
  .pf-score-main strong {
    font-family: var(--pf-display);
    font-size: 3.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .pf-stars {
    color: #b07d00;
    letter-spacing: 0.08em;
    font-size: 0.82rem;
  }
  .pf-criteria {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1.5rem;
    font-size: 0.85rem;
  }
  .pf-reviews {
    margin-top: 0.4rem;
  }
  .pf-review {
    padding: 1rem 0;
    border-bottom: 1px solid var(--pf-line);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.88rem;
  }
  .pf-review-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.6rem;
  }
  .pf-paid {
    background: #e2f3e8;
    color: var(--pf-green-deep);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.64rem;
    font-weight: 700;
  }
  .pf-reply {
    background: var(--pf-cream);
    border-radius: 10px;
    padding: 0.55rem 0.8rem;
    font-size: 0.78rem;
  }

  /* ---------- Colonne latérale ---------- */
  .pf-book {
    position: sticky;
    top: 5.5rem;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 2px solid var(--pf-ink);
    border-radius: 20px;
    padding: 1.2rem 1.2rem 1.3rem;
  }
  .pf-book-price {
    font-family: var(--pf-display);
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .pf-book h3,
  .pf-share h3,
  .pf-zone h3 {
    font-family: var(--pf-font);
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0;
  }
  .pf-book h3 {
    margin: 1.1rem 0 0.6rem;
  }
  .pf-slots {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.45rem;
    margin-bottom: 1rem;
  }
  .pf-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
    border: 1px solid var(--pf-line);
    background: #fff;
    border-radius: 10px;
    padding: 0.45rem 0.2rem;
    font: inherit;
    font-size: 0.7rem;
    color: var(--pf-ink);
    cursor: pointer;
  }
  .pf-slot.on {
    background: var(--pf-dark);
    border-color: var(--pf-dark);
    color: #fff;
  }
  .pf-fine {
    margin-top: 0.9rem !important;
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--pf-ink-soft) !important;
  }

  .pf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 0.8rem 1rem;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px solid transparent;
    color: var(--pf-ink);
    text-decoration: none;
  }
  .pf-btn:hover {
    filter: brightness(0.96);
  }
  .pf-btn-yellow {
    background: var(--pf-yellow);
  }
  .pf-btn-dark {
    background: var(--pf-ink);
    color: #fff;
  }
  .pf-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    filter: none;
  }
  .pf-btn-outline {
    background: #fff;
    border-color: var(--pf-ink);
  }
  .pf-book .pf-btn + .pf-btn {
    margin-top: 0.6rem;
  }

  .pf-share {
    background: var(--pf-cream);
    border-radius: 20px;
    padding: 1.1rem 1.2rem 1.2rem;
  }
  .pf-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: #fff;
    border-radius: 10px;
    padding: 0.4rem 0.4rem 0.4rem 0.8rem;
    margin: 0.8rem 0;
    font-size: 0.82rem;
  }
  .pf-copy span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pf-copy button {
    flex: none;
    border: 0;
    background: var(--pf-dark);
    color: #fff;
    border-radius: 8px;
    padding: 0.4rem 0.8rem;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
  }
  .pf-share-row {
    display: grid;
    grid-template-columns: 5.6rem minmax(0, 1fr);
    gap: 0.7rem;
    align-items: stretch;
  }
  .pf-qr {
    background: #fff;
    border: 1px solid var(--pf-line);
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 0.66rem;
    color: var(--pf-ink-soft);
    min-height: 5.6rem;
  }
  .pf-share-btns {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pf-share-btns .pf-btn {
    flex: 1;
    padding: 0.5rem 0.6rem;
    font-size: 0.82rem;
  }
  .pf-share .pf-fine {
    margin-top: 0.7rem !important;
  }

  .pf-zone {
    border: 1px solid var(--pf-line);
    border-radius: 20px;
    padding: 1.1rem 1.2rem 1.2rem;
  }
  .pf-map {
    margin-top: 0.8rem;
    height: 13rem;
    border-radius: 12px;
    background: var(--pf-cream-deep);
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 0.72rem;
    color: #6b6a55;
    padding: 0 0.5rem;
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 960px) {
    .pf-grid {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "head"
        "side"
        "main";
    }
    .pf-side {
      margin-top: 1.6rem;
    }
    .pf-book {
      position: static;
    }
    .pf-main {
      margin-top: 2rem;
    }
  }
  @media (max-width: 640px) {
    .pf-cover {
      height: 8.5rem;
    }
    .pf-id {
      flex-direction: column;
      gap: 0.3rem;
    }
    .pf-avatar {
      width: 5.6rem;
      height: 5.6rem;
      font-size: 1.8rem;
      margin-top: -2.8rem;
    }
    .pf-id-text {
      padding-top: 0;
    }
    .pf-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .pf-works {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .pf-trainings {
      grid-template-columns: 1fr;
    }
    .pf-score {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .pf-criteria {
      grid-template-columns: 1fr;
    }
    .pf-row {
      flex-direction: column;
      gap: 0.2rem;
    }
  }

  /* ---------- Ajouts (version dynamique) ---------- */
  .pf-cover {
    background-size: cover;
    background-position: center;
  }
  .pf-avatar-img {
    object-fit: cover;
    background: var(--pf-green);
  }
  .pf-mt {
    margin-top: 0.2rem;
  }
  .pf-book-quote {
    font-size: 1.5rem;
  }
  .pf-langs {
    margin-top: 0.6rem !important;
    font-size: 0.85rem;
    color: var(--pf-ink-soft) !important;
  }
  .pf-empty {
    font-size: 0.9rem;
  }
  .pf-work {
    text-decoration: none;
    color: #6b6a55;
    position: relative;
    overflow: hidden;
  }
  .pf-work-img img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pf-work-tag {
    position: absolute;
    left: 0.6rem;
    bottom: 0.6rem;
    background: rgba(29, 38, 33, 0.85);
    color: #fff;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font-size: 0.66rem;
    font-weight: 700;
  }
  .pf-qr img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  .pf-zone-label {
    margin-top: 0.6rem !important;
  }
  .pf-map {
    z-index: 0;
  }
  .pf-maplink {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: #0f7d41;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
