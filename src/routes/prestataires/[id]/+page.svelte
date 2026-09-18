<script lang="ts">
  import { page } from "$app/stores";
  import { createContactRequest, myContactRequestsAsClient } from "$lib/api/contactRequests";
  import { searchPrestataires } from "$lib/api/matching";
  import { createReview, getPrestataireReviews } from "$lib/api/reviews";
  import { getMetier } from "$lib/api/taxonomy";
  import type { ContactRequestClient, Prestataire, MetierDetail, ReviewSummary } from "$lib/api/types";
  import { auth } from "$lib/stores/auth.svelte";
  import { localize } from "$lib/i18n/localize";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Award from "@lucide/svelte/icons/award";
  import Send from "@lucide/svelte/icons/send";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Star from "@lucide/svelte/icons/star";
  import MessageSquareText from "@lucide/svelte/icons/message-square-text";

  let prestataire = $state<Prestataire | null>(null);
  let metiers = $state<MetierDetail[]>([]);
  let reviewSummary = $state<ReviewSummary | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let newRating = $state(5);
  let newComment = $state("");
  let submittingReview = $state(false);

  let existingContactRequest = $state<ContactRequestClient | null>(null);
  let requestingContact = $state(false);

  // Garde-fous contre les re-declenchements du $effect qui ne changent ni
  // l'id ni le role (ex: mutations de stores globaux sans rapport, comme le
  // compteur de requetes en cours) : sans ca, chaque re-execution relancerait
  // les memes appels et empilerait des requetes identiques.
  let loadedForId = $state<number | null>(null);
  let contactCheckedFor = $state<string | null>(null);

  $effect(() => {
    const id = Number($page.params.id);
    if (id !== loadedForId) {
      loadedForId = id;
      loadData(id);
      loadReviews(id);
    }
    const contactKey = `${auth.role ?? ""}:${id}`;
    if (auth.role === "client" && contactKey !== contactCheckedFor) {
      contactCheckedFor = contactKey;
      loadExistingContactRequest(id);
    }
  });

  async function loadExistingContactRequest(prestataireId: number) {
    try {
      const requests = await myContactRequestsAsClient();
      existingContactRequest = requests.find((r) => r.prestataire_id === prestataireId) ?? null;
    } catch {
      existingContactRequest = null;
    }
  }

  async function handleRequestContact() {
    if (!prestataire) return;
    requestingContact = true;
    try {
      existingContactRequest = await createContactRequest(prestataire.id);
      snackbar.success("Votre demande de contact a été envoyée, elle est en attente de validation.");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      requestingContact = false;
    }
  }

  async function loadData(id: number) {
    loading = true;
    try {
      const all = await searchPrestataires();
      prestataire = all.find((p) => p.id === id) ?? null;
      if (prestataire) {
        // Charger les métiers correspondant aux certifications
        const metierCodes = new Set<string>();
        for (const cert of prestataire.certifications) {
          const parts = cert.split("_niveau_");
          if (parts[0]) metierCodes.add(parts[0].replace(/_/g, "-"));
        }
        const loaded: MetierDetail[] = [];
        for (const code of metierCodes) {
          try {
            const m = await getMetier(code);
            loaded.push(m);
          } catch { /* skip */ }
        }
        metiers = loaded;
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function loadReviews(id: number) {
    try {
      reviewSummary = await getPrestataireReviews(id);
    } catch {
      reviewSummary = null;
    }
  }

  async function handleSubmitReview(event: SubmitEvent) {
    event.preventDefault();
    if (!prestataire) return;
    submittingReview = true;
    try {
      await createReview({ prestataire_id: prestataire.id, rating: newRating, comment: newComment.trim() || undefined });
      newComment = "";
      newRating = 5;
      snackbar.success("Merci pour votre avis !");
      await loadReviews(prestataire.id);
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      submittingReview = false;
    }
  }

  // Page en ssr = false (voir +page.ts) : ces balises ne sont donc utiles
  // qu'apres hydratation cote client, pas dans le HTML initial servi aux
  // robots/crawlers qui n'executent pas JS.
</script>

<Seo
  title={prestataire ? `${prestataire.firstname} — Prestataire certifié | Trankyl Academy` : "Prestataire certifié — Trankyl Academy"}
  description={prestataire
    ? `${prestataire.firstname} ${prestataire.lastname}, prestataire certifié Trankyl Academy${prestataire.certifications.length ? ` (${prestataire.certifications.length} certification${prestataire.certifications.length > 1 ? "s" : ""})` : ""}.`
    : "Profil d'un prestataire certifié Trankyl Academy."}
/>

<div class="profile-page">
  {#if loading}
    <div class="loading-state">Chargement du profil...</div>
  {:else if error}
    <div class="alert-error">{error}</div>
  {:else if !prestataire}
    <div class="empty-state">
      <h2>Prestataire introuvable</h2>
      <a href="/prestataires" class="back-link"><ArrowLeft size={15} /> Retour à la recherche</a>
    </div>
  {:else}
    <!-- Back -->
    <a class="back-link" href="/prestataires"><ArrowLeft size={15} /> Tous les prestataires</a>

    <!-- Profile Header -->
    <div class="profile-header">
      <div class="profile-avatar">
        {prestataire.firstname[0]}{prestataire.lastname[0]}
      </div>
      <div class="profile-main">
        <h1>{prestataire.firstname} {prestataire.lastname}</h1>
        <p class="profile-subtitle">Prestataire Trankyl Academy</p>
        {#if reviewSummary && reviewSummary.review_count > 0}
          <div class="rating-summary">
            <Star size={15} class="star-filled" />
            <span class="rating-value">{reviewSummary.average_rating}</span>
            <span class="rating-count">({reviewSummary.review_count} avis)</span>
          </div>
        {/if}
      </div>
      <div class="profile-actions">
        {#if auth.role === "apprenant"}
          <a href="/messagerie?user={prestataire.id}" class="btn-contact">
            <Send size={16} /> Contacter
          </a>
        {:else if auth.role === "client"}
          {#if existingContactRequest?.status === "approved"}
            <a href="/client/messagerie?request={existingContactRequest.id}" class="btn-contact">
              <Send size={16} /> Ouvrir la conversation
            </a>
          {:else if existingContactRequest?.status === "pending"}
            <span class="btn-contact-outline" title="Un admin doit valider votre demande avant que la messagerie s'ouvre">
              Demande en attente de validation
            </span>
          {:else if existingContactRequest?.status === "rejected"}
            <span class="btn-contact-outline">Demande non retenue</span>
          {:else}
            <button class="btn-contact" onclick={handleRequestContact} disabled={requestingContact}>
              <Send size={16} /> {requestingContact ? "Envoi..." : "Demander à être mis en relation"}
            </button>
          {/if}
        {:else}
          <a href="/client/login" class="btn-contact-outline">Se connecter pour contacter</a>
        {/if}
      </div>
    </div>

    <!-- Certifications -->
    <div class="section-card">
      <h2><Award size={18} /> Certifications obtenues</h2>
      {#if prestataire.certifications.length > 0}
        <p class="cert-total">{prestataire.certifications.length} certification{prestataire.certifications.length > 1 ? "s" : ""} au total</p>
        <div class="cert-grid">
          {#each metiers as metier (metier.code)}
            <div class="cert-card">
              <Award size={20} class="cert-icon" />
              <div>
                <span class="cert-name">{localize(metier.nom, metier.nom_en)}</span>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="muted">Aucune certification obtenue pour le moment.</p>
      {/if}
    </div>

    <!-- Compétences par métier -->
    {#if metiers.length > 0}
      <div class="section-card">
        <h2><GraduationCap size={18} /> Compétences</h2>
        {#each metiers as metier}
          <div class="metier-section">
            <h3>{localize(metier.nom, metier.nom_en)}</h3>
            {#each metier.niveaux as niveau}
              {@const certsOfNiveau = prestataire.certifications.filter((c) => c.includes(`_niveau_${niveau.numero}`))}
              {#if certsOfNiveau.length > 0 || niveau.competences.length > 0}
                <div class="niveau-row" class:certified={certsOfNiveau.length > 0}>
                  <span class="niveau-label">Niveau {niveau.numero} — {localize(niveau.nom, niveau.nom_en)}</span>
                  {#if certsOfNiveau.length > 0}
                    <span class="badge-gold"><Award size={10} /> Certifié</span>
                  {/if}
                </div>
                {#if niveau.description}
                  <p class="niveau-desc">{localize(niveau.description, niveau.description_en)}</p>
                {/if}
                <div class="comp-list">
                  {#each niveau.competences as comp}
                    <span class="comp-chip">
                      {localize(comp.titre, comp.titre_en)}
                      {#if comp.modules.length > 0}<em>· {comp.modules.length} module{comp.modules.length > 1 ? "s" : ""}</em>{/if}
                    </span>
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Avis clients -->
    <div class="section-card">
      <h2><MessageSquareText size={18} /> Avis clients</h2>

      {#if auth.role === "client"}
        <form class="review-form" onsubmit={handleSubmitReview}>
          <div class="star-picker">
            {#each [1, 2, 3, 4, 5] as n}
              <button
                type="button"
                class="star-btn"
                class:filled={n <= newRating}
                onclick={() => (newRating = n)}
                aria-label={`${n} étoile(s)`}
              >
                <Star size={20} />
              </button>
            {/each}
          </div>
          <textarea placeholder="Partagez votre expérience (optionnel)..." bind:value={newComment} rows="2"></textarea>
          <button class="btn-primary-sm" type="submit" disabled={submittingReview}>
            {submittingReview ? "Envoi..." : "Publier mon avis"}
          </button>
        </form>
      {/if}

      {#if !reviewSummary || reviewSummary.reviews.length === 0}
        <p class="muted">Aucun avis pour le moment.</p>
      {:else}
        <ul class="review-list">
          {#each reviewSummary.reviews as review}
            <li class="review-item">
              <div class="review-header">
                <span class="review-author">{review.client_firstname}</span>
                <span class="review-stars">
                  {#each [1, 2, 3, 4, 5] as n}
                    <Star size={13} class={n <= review.rating ? "star-filled" : "star-empty"} />
                  {/each}
                </span>
              </div>
              {#if review.comment}<p class="review-comment">{review.comment}</p>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .profile-page { padding-bottom: 3rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.5rem; color: #028a15; font-size: 0.88rem; font-weight: 600; text-decoration: none; }
  .back-link:hover { text-decoration: underline; }
  .profile-header { display: flex; align-items: center; gap: 1.25rem; padding: 2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; margin-bottom: 1.25rem; }
  .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #fec600; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; flex-shrink: 0; }
  .profile-main { flex: 1; }
  .profile-main h1 { font-size: 1.5rem; font-weight: 800; color: #111827; margin: 0 0 0.2rem; }
  .profile-subtitle { font-size: 0.88rem; color: #6b7280; margin: 0; }
  .btn-contact { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem; border: none; border-radius: 10px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.88rem; text-decoration: none; cursor: pointer; }
  .btn-contact:hover { background: #028a15; text-decoration: none; }
  .btn-contact:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-contact-outline { display: inline-flex; align-items: center; padding: 0.6rem 1.2rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #374151; font-family: inherit; font-weight: 600; font-size: 0.88rem; text-decoration: none; }
  .btn-contact-outline:hover { border-color: #03a71a; color: #047857; text-decoration: none; }
  .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.5rem; margin-bottom: 1.25rem; }
  .section-card h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem; font-weight: 700; color: #111827; margin: 0 0 1rem; }
  .cert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; }
  .cert-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff3cd; border-radius: 10px; border: 1px solid #fde68a; }
  .cert-card :global(.cert-icon) { color: #d97706; flex-shrink: 0; }
  .cert-name { display: block; font-size: 0.88rem; font-weight: 700; color: #111827; }
  .cert-total { font-size: 0.82rem; font-weight: 600; color: #6b7280; margin: -0.5rem 0 0.85rem; }
  .metier-section { margin-bottom: 1.25rem; }
  .metier-section h3 { font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem; }
  .niveau-row { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; }
  .niveau-row.certified { color: #047857; }
  .niveau-label { font-size: 0.85rem; font-weight: 600; color: #374151; }
  .badge-gold { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 6px; background: #fff3cd; color: #8a6800; }
  .niveau-desc { font-size: 0.8rem; color: #6b7280; margin: 0 0 0.5rem; }
  .comp-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
  .comp-chip { font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: 6px; background: #f3f4f6; color: #374151; }
  .comp-chip em { font-style: normal; font-weight: 500; color: #9ca3af; }
  .rating-summary { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.35rem; font-size: 0.85rem; }
  :global(.star-filled) { color: #d97706; fill: #fbbf24; }
  :global(.star-empty) { color: #d1d5db; }
  .rating-value { font-weight: 700; color: #111827; }
  .rating-count { color: #9ca3af; }

  .review-form { display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem; background: #f9fafb; border-radius: 10px; margin-bottom: 1.25rem; }
  .star-picker { display: flex; gap: 0.2rem; }
  .star-btn { background: none; border: none; padding: 0.1rem; cursor: pointer; color: #d1d5db; }
  .star-btn.filled { color: #d97706; }
  .star-btn.filled :global(svg) { fill: #fbbf24; }
  .review-form textarea { font-family: inherit; font-size: 0.85rem; padding: 0.6rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #fff; resize: vertical; }
  .btn-primary-sm { align-self: flex-start; padding: 0.5rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .btn-primary-sm:disabled { opacity: 0.6; cursor: not-allowed; }

  .review-list { display: flex; flex-direction: column; gap: 0.85rem; }
  .review-item { padding-bottom: 0.85rem; border-bottom: 1px solid #f3f4f6; }
  .review-item:last-child { border-bottom: none; padding-bottom: 0; }
  .review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem; }
  .review-author { font-size: 0.85rem; font-weight: 700; color: #111827; }
  .review-stars { display: inline-flex; gap: 0.1rem; }
  .review-comment { font-size: 0.85rem; color: #4b5563; margin: 0; }

  .loading-state, .empty-state { text-align: center; padding: 3rem; color: #6b7280; }
  .empty-state h2 { color: #111827; }
  .alert-error { padding: 0.7rem 1rem; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; font-weight: 600; border: 1px solid #fecaca; }
  .muted { color: #9ca3af; font-size: 0.88rem; }
  @media (max-width: 600px) {
    .profile-header { flex-direction: column; text-align: center; }
    .cert-grid { grid-template-columns: 1fr; }
  }
</style>
