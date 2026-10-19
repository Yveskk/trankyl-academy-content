<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import "$lib/components/home/home.css";
  import Typewriter from "$lib/components/home/Typewriter.svelte";
  import HeroSlides from "$lib/components/home/HeroSlides.svelte";
  import type { PageData } from "./$types";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";

  let { data }: { data: PageData } = $props();
  let sp = $derived(data.slideSettings ?? {});

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);

  // Redirections : prestataire -> inscription prestataire ; apprenant -> inscription apprenant.
  const PROVIDER_HREF = "/register?profil=prestataire";
  const LEARNER_HREF = "/register";

  const features = $derived([
    { title: t("Des demandes près de chez vous", "Requests near you"), text: t("SITA vous envoie les demandes de votre métier et de votre quartier, avec photos et budget.", "SITA sends you requests for your trade and your neighbourhood, with photos and budget.") },
    { title: t("Payé sans courir après", "Paid without chasing"), text: t("Le client paie avant la mission. Vous recevez l'argent sur Mobile Money dès la validation.", "The customer pays before the job. You receive the money on Mobile Money as soon as it is approved.") },
    { title: t("Un profil qui vous vend", "A profile that sells you"), text: t("Lien et QR code à partager sur WhatsApp, Facebook, TikTok et votre carte de visite.", "Link and QR code to share on WhatsApp, Facebook, TikTok and your business card.") },
    { title: t("Devis et factures en 30 s", "Quotes and invoices in 30 s"), text: t("Modèles prêts, envoi PDF ou WhatsApp, suivi des paiements.", "Ready-made templates, PDF or WhatsApp sending, payment tracking.") },
    { title: t("Formé et certifié", "Trained and certified"), text: t("Parcours vidéo, audio en langues locales, quiz et badge « Certifié Académie ».", "Video courses, audio in local languages, quizzes and an “Academy Certified” badge.") },
    { title: t("Protégé", "Protected"), text: t("Assurance accident et responsabilité civile en mission avec notre partenaire.", "Accident insurance and civil liability on jobs with our partner.") },
  ]);

  const steps = $derived([
    { title: t("Créez votre profil", "Create your profile"), text: t("Métier, zone, photos de vos réalisations, prix indicatifs.", "Trade, area, photos of your work, indicative prices.") },
    { title: t("Faites-vous vérifier", "Get verified"), text: t("Pièce d'identité, selfie, adresse, 2 références, entretien.", "ID, selfie, address, 2 references, interview.") },
    { title: t("Suivez le module obligatoire", "Take the mandatory module"), text: t("Relation client et sécurité, 45 min, sur l'Académie.", "Customer relations and safety, 45 min, on the Academy.") },
    { title: t("Recevez des missions", "Receive jobs"), text: t("Devis depuis l'app, paiement protégé, retrait Mobile Money.", "Quotes from the app, protected payment, Mobile Money withdrawal.") },
  ]);

  const freeList = $derived([
    t("Profil public et lien à partager", "Public profile and shareable link"),
    t("Demandes dans votre zone", "Requests in your area"),
    t("Devis et factures", "Quotes and invoices"),
    t("Académie : parcours gratuits", "Academy: free courses"),
  ]);
  const proList = $derived([
    t("Mise en avant dans les résultats", "Featured in search results"),
    t("Coach SITA Pro illimité", "Unlimited SITA Pro coach"),
    t("Statistiques détaillées", "Detailed statistics"),
    t("Assurance accident incluse", "Accident insurance included"),
  ]);
</script>

<Seo title={t("Devenir prestataire", "Become a provider")} description={t("Choisissez votre profil pour rejoindre Trankyl Academy.", "Choose your profile to join Trankyl Academy.")} />

<div class="ac jp-page">
<section class="jp-hero">
  <div class="wrap jp-hero-grid">
    <div class="jp-hero-text">
      <h1>
        <Typewriter
          text={t("Votre métier mérite plus de clients.", "Your trade deserves more customers.")}
          highlight={t("plus de clients.", "more customers.")}
          highlightColor="#ffc72c"
          caretColor="#ffc72c"
        />
      </h1>
      <p class="sub">{t("Rejoignez Trankyl : recevez des demandes près de chez vous, soyez payé par Mobile Money, formez-vous et faites grandir votre réputation.", "Join Trankyl: get requests near you, get paid by Mobile Money, train and grow your reputation.")}</p>
      <div class="actions">
        <a class="btn-yellow" href={PROVIDER_HREF} data-option="prestataire">{t("Je suis prestataire", "I'm a provider")} <ArrowRight size={18} /></a>
        <a class="btn-outline" href={LEARNER_HREF} data-option="apprenant">{t("Je suis apprenant", "I'm a learner")}</a>
      </div>
      <p class="note">{t("Inscription en 10 minutes depuis votre téléphone · aucune commission sans mission", "Sign up in 10 minutes from your phone · no commission without a job")}</p>
    </div>

    <!-- Meme structure que le hero de l'accueil client (bloc colore, affiches, encart paiement) -->
    <div class="ac-hero-visual jp-hero-visual">
      <div class="ac-hero-green"></div>
      {#if data.slides.length > 0}
        <div class="ac-slides">
          <HeroSlides
            slides={data.slides}
            transition={sp.transition}
            autoplay={sp.autoplay !== false}
            interval={Number(sp.interval_ms) || 4500}
            pauseOnHover={sp.pause_on_hover !== false}
            loop={sp.loop !== false}
            showDots={sp.show_dots !== false}
            showArrows={sp.show_arrows !== false}
            showProgress={sp.show_progress !== false}
            ratio={sp.ratio}
            fit={sp.fit}
            showCaption={sp.show_caption === true}
          />
        </div>
      {/if}
      <div class="ac-pay-note">
        <span class="ac-pay-kicker">{t("Paiement protégé", "Protected payment")}</span>
        <p>{t("Le client paie avant la mission. Vous recevez l'argent sur Mobile Money dès la validation.", "The customer pays before the job. You receive the money on Mobile Money as soon as it is approved.")}</p>
      </div>
    </div>
  </div>
</section>

<section class="features">
  <div class="wrap">
    <h2>{t("Tout ce qu'il faut pour travailler mieux", "Everything you need to work better")}</h2>
    <div class="feat-grid">
      {#each features as f, i (f.title)}
        <div class="feat">
          <span class="fnum" class:dk={i % 2 === 1}>{String(i + 1).padStart(2, "0")}</span>
          <h3>{f.title}</h3>
          <p>{f.text}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="journey" id="how">
  <div class="wrap">
    <div class="journey-box">
      <h2>{t("De l'inscription à la première mission", "From sign-up to your first job")}</h2>
      <div class="steps">
        {#each steps as s, i (s.title)}
          <div class="step">
            <b>{i + 1}</b>
            <strong>{s.title}</strong>
            <p>{s.text}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="plans">
  <div class="wrap">
    <h2>{t("Deux formules, aucune surprise", "Two plans, no surprises")}</h2>
    <div class="plan-grid">
      <div class="plan">
        <span class="plan-kicker">{t("ESSENTIEL", "ESSENTIAL")}</span>
        <div class="plan-price">{t("Gratuit", "Free")}</div>
        <small>+ [X] % {t("de commission par mission payée", "commission per paid job")}</small>
        <ul>{#each freeList as li}<li>{li}</li>{/each}</ul>
      </div>
      <div class="plan pro">
        <span class="plan-tag">{t("RECOMMANDÉ", "RECOMMENDED")}</span>
        <span class="plan-kicker gold">TRANKYL PRO</span>
        <div class="plan-price">[PRIX] F <span>/ {t("mois", "month")}</span></div>
        <small>{t("commission réduite à", "commission reduced to")} [Y] %</small>
        <ul>{#each proList as li}<li>{li}</li>{/each}</ul>
      </div>
    </div>
  </div>
</section>

<section class="closing">
  <div class="wrap closing-grid">
    <div>
      <span class="plan-kicker dark">{t("ILS TRAVAILLENT AVEC TRANKYL", "THEY WORK WITH TRANKYL")}</span>
      <blockquote>« [{t("Témoignage réel d'un prestataire : ce que Trankyl a changé pour lui", "Real provider testimonial: what Trankyl changed for them")}] »</blockquote>
      <small>[{t("Prénom", "First name")}], [{t("métier", "trade")}], [{t("ville", "city")}] · {t("Certifié Académie", "Academy Certified")}</small>
    </div>
    <div class="ready">
      <strong>{t("Prêt à commencer ?", "Ready to start?")}</strong>
      <p>{t("Téléchargez Trankyl Heros ou inscrivez-vous ici.", "Download Trankyl Heros or sign up here.")}</p>
      <a class="btn-yellow wide" href={PROVIDER_HREF}>{t("Je m'inscris", "Sign up")}</a>
    </div>
  </div>
</section>
</div>

<style>
  :global(:root) {
    --jp-dark: #2b2f36;
    --jp-darker: #22262c;
    --jp-yellow: #ffc72c;
    --jp-gray: #cfd3d9;
    --jp-gray-ink: #1f2937;
  }
  /* meme largeur que l'accueil client (.ac-wrap) */
  .wrap {
    width: min(1480px, 100% - clamp(2.5rem, 7vw, 8rem));
    margin-inline: auto;
  }

  /* ---------------- hero sombre ---------------- */
  .jp-hero {
    background: linear-gradient(135deg, #f3f4f6 0%, #d9dce1 42%, #aeb4bd 78%, #d1d5db 100%);
    color: var(--jp-gray-ink);
    padding: clamp(2.5rem, 6vw, 4.5rem) 0;
  }
  .jp-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: clamp(2rem, 5vw, 4rem);
    align-items: center;
  }
  .jp-badge {
    color: var(--jp-gray-ink);
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    background: rgba(31, 41, 55, 0.1);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .jp-badge i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--jp-yellow);
  }
  .jp-page h1 {
    color: var(--jp-gray-ink);
    margin: 1rem 0 1rem;
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .sub {
    max-width: 34rem;
    margin: 0 0 1.6rem;
    color: #374151;
    font-size: 1.05rem;
    line-height: 1.6;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .btn-yellow,
  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.4rem;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.95rem;
    text-decoration: none;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .btn-yellow {
    background: var(--jp-yellow);
    color: var(--jp-dark);
  }
  .btn-yellow:hover {
    background: #ffd25a;
    transform: translateY(-2px);
    text-decoration: none;
  }
  .btn-outline {
    border: 1px solid var(--jp-gray-ink);
    color: var(--jp-gray-ink);
  }
  .btn-outline:hover {
    background: rgba(31, 41, 55, 0.08);
    transform: translateY(-2px);
    text-decoration: none;
  }
  .note {
    margin: 1.2rem 0 0;
    font-size: 0.82rem;
    color: #4b5563;
  }

  /* ---------------- cartes décoratives ---------------- */
  .jp-page {
    background: #f0f1f3;
  }
  .jp-hero-visual {
    min-width: 0;
  }
  /* bloc colore derriere les affiches : jaune Trankyl Pro (le vert reste celui de l'accueil client) */
  .jp-page :global(.ac-hero-green) {
    background: var(--jp-yellow);
  }
  .jp-page :global(.ac-pay-note) {
    background: #fff;
    color: var(--jp-gray-ink);
  }
  .jp-page :global(.ac-pay-kicker) {
    color: #4b5563;
  }
  .jp-page :global(.ac-pay-note p) {
    color: var(--jp-gray-ink);
  }

  /* ---------------- sections ---------------- */
  .jp-page h2 {
    margin: 0 0 1.5rem;
    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
    font-weight: 800;
    color: #1b1e23;
  }
  .jp-page h3 {
    margin: 0.7rem 0 0.4rem;
    font-size: 1.05rem;
    color: #1b1e23;
  }
  .features {
    background: #f0f1f3;
    padding: clamp(2.5rem, 5vw, 4rem) 0 1rem;
  }
  .feat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
  }
  .feat {
    padding: 1.1rem 1.2rem 1.3rem;
    border-radius: 16px;
    background: #fff;
  }
  .feat p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.5;
    color: #6b7280;
  }
  .fnum {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: var(--jp-yellow);
    color: var(--jp-dark);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .fnum.dk {
    background: var(--jp-gray);
    color: var(--jp-gray-ink);
  }
  .journey {
    background: #f0f1f3;
    padding: 2rem 0;
  }
  .journey-box {
    padding: clamp(1.5rem, 3vw, 2rem) clamp(1.5rem, 3vw, 2rem) 2rem;
    border-radius: 26px;
    background: linear-gradient(135deg, #f3f4f6 0%, #d9dce1 42%, #aeb4bd 78%, #d1d5db 100%);
    color: var(--jp-gray-ink);
  }
  .jp-page .journey-box h2 {
    color: var(--jp-gray-ink);
    font-size: clamp(1.4rem, 2.6vw, 1.8rem);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .step {
    padding-top: 0.9rem;
    border-top: 2px solid #6b7280;
  }
  .step b {
    display: block;
    font-size: 1.9rem;
    color: #4b5563;
  }
  .step strong {
    font-size: 0.9rem;
  }
  .step p {
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #374151;
  }
  .plans {
    background: #f0f1f3;
    padding: 1.5rem 0 3.5rem;
  }
  .plan-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }
  .plan {
    position: relative;
    padding: 1.5rem;
    border-radius: 20px;
    background: #fff;
    border: 1px solid #e3e5e9;
    color: #1b1e23;
  }
  .plan.pro {
    background: linear-gradient(135deg, #f3f4f6 0%, #d9dce1 42%, #aeb4bd 78%, #d1d5db 100%);
    border-color: #aeb4bd;
    color: var(--jp-gray-ink);
  }
  .plan-kicker {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #6b7280;
  }
  .plan-kicker.gold {
    color: #4b5563;
  }
  .plan-kicker.dark {
    color: var(--jp-dark);
  }
  .plan-tag {
    position: absolute;
    top: 0.9rem;
    right: 0.9rem;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: var(--jp-yellow);
    color: var(--jp-dark);
    font-size: 0.68rem;
    font-weight: 800;
  }
  .plan-price {
    margin: 0.3rem 0 0.1rem;
    font-size: 2rem;
    font-weight: 800;
  }
  .plan-price span {
    font-size: 0.9rem;
  }
  .plan small {
    color: #6b7280;
  }
  .plan.pro small {
    color: #4b5563;
  }
  .plan ul {
    margin: 1.1rem 0 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.92rem;
  }
  .closing {
    background: var(--jp-yellow);
    padding: 3rem 0;
  }
  .closing-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
    gap: 3rem;
    align-items: center;
    color: var(--jp-dark);
  }
  blockquote {
    margin: 0.6rem 0;
    font-size: clamp(1.4rem, 2.6vw, 1.9rem);
    font-weight: 700;
    line-height: 1.25;
  }
  .ready {
    padding: 1.4rem;
    border-radius: 20px;
    background: var(--jp-gray);
    color: var(--jp-gray-ink);
  }
  .ready strong {
    font-size: 1.1rem;
  }
  .ready p {
    margin: 0.3rem 0 1rem;
    font-size: 0.85rem;
    color: #374151;
  }
  .btn-yellow.wide {
    width: 100%;
    padding: 0.7rem;
  }

  @media (max-width: 860px) {
    .jp-hero-grid,
    .plan-grid,
    .closing-grid {
      grid-template-columns: 1fr;
    }
    .feat-grid,
    .steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .btn-yellow,
    .btn-outline {
      transition: none;
    }
  }
</style>
