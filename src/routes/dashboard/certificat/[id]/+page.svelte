<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { myCertifications } from "$lib/api/certifications";
  import { me } from "$lib/api/auth";
  import type { Certification, Apprenant } from "$lib/api/types";
  import Award from "@lucide/svelte/icons/award";
  import Download from "@lucide/svelte/icons/download";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";

  let cert = $state<Certification | null>(null);
  let apprenant = $state<Apprenant | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      const id = Number($page.params.id);
      const [certs, user] = await Promise.all([myCertifications(), me()]);
      cert = certs.find((c) => c.id === id) ?? null;
      apprenant = user;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  function certLabel(code: string): string {
    const parts = code.split("_niveau_");
    const metier = parts[0]?.replace(/_/g, " ") ?? code;
    const niveau = parts[1] ?? "?";
    return `${metier.charAt(0).toUpperCase() + metier.slice(1)} — Niveau ${niveau}`;
  }

  function printCert() {
    window.print();
  }
</script>

<svelte:head>
  <title>{cert ? `Certificat — ${certLabel(cert.code)}` : "Certificat"} — Trankyl Academy</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="cert-page">
  <a class="back-link" href="/dashboard"><ArrowLeft size={15} /> Retour au tableau de bord</a>

  {#if loading}
    <div class="loading">Chargement...</div>
  {:else if !cert || !apprenant}
    <div class="empty">Certification introuvable.</div>
  {:else}
    <!-- Certificate Card -->
    <div class="certificate" id="certificate">
      <div class="cert-frame">
        <div class="cert-inner">
          <span class="corner tl" aria-hidden="true"></span>
          <span class="corner tr" aria-hidden="true"></span>
          <span class="corner bl" aria-hidden="true"></span>
          <span class="corner br" aria-hidden="true"></span>

          <!-- Header -->
          <div class="cert-header">
            <img class="cert-logo-img" src="/logo.svg" alt="Trankyl" />
            <div class="cert-divider">
              <span class="line"></span>
              <span class="diamond">◆</span>
              <span class="line"></span>
            </div>
            <p class="cert-subtitle">Certificat de compétence professionnelle</p>
          </div>

          <!-- Body -->
          <div class="cert-body">
            <p class="cert-text">Il est certifié que</p>
            <h2 class="cert-name">{apprenant.firstname} {apprenant.lastname}</h2>
            <p class="cert-text">
              a satisfait à l'ensemble des exigences académiques et pratiques requises pour
              l'obtention de la certification
            </p>

            <p class="cert-degree">{certLabel(cert.code)}</p>

            <p class="cert-text small">
              délivrée par Trankyl Academy le {new Date(cert.delivree_at).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <!-- Footer -->
          <div class="cert-footer">
            <div class="cert-signature">
              <span class="signature-script">Trankyl Academy</span>
              <div class="signature-line"></div>
              <p>La Direction</p>
              <small>Trankyl Academy</small>
            </div>

            <div class="cert-seal" aria-hidden="true">
              <div class="seal-medal">
                <Award size={26} />
              </div>
              <div class="seal-ribbon"></div>
            </div>

            <div class="cert-meta">
              <div class="signature-line"></div>
              <p>Code {cert.code}</p>
              <small>N° {cert.id} · version {cert.taxonomy_version}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="cert-actions no-print">
      <button class="btn-download" onclick={printCert}>
        <Download size={16} /> Télécharger / Imprimer
      </button>
    </div>
  {/if}
</div>

<style>
  .cert-page { padding: 1.5rem 0 3rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 1.5rem; color: #028a15; font-size: 0.88rem; font-weight: 600; text-decoration: none; }
  .back-link:hover { text-decoration: underline; }
  .loading, .empty { text-align: center; padding: 3rem; color: #6b7280; }

  /* Certificate */
  .certificate { max-width: 840px; margin: 0 auto; }

  .cert-frame {
    background: linear-gradient(135deg, #04330d, #03a71a 45%, #fec600 100%);
    padding: 10px;
    border-radius: 18px;
    box-shadow: 0 30px 70px rgba(4, 51, 13, 0.28);
  }

  .cert-inner {
    position: relative;
    z-index: 0;
    background: radial-gradient(ellipse at center, rgba(4, 51, 13, 0.035), transparent 65%), #fdfaf2;
    border: 1.5px solid rgba(4, 51, 13, 0.18);
    border-radius: 12px;
    padding: 3.25rem 3.5rem 2.75rem;
    text-align: center;
    overflow: hidden;
  }

  .cert-inner::before {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0;
    background: url("/logo.svg") center / 340px no-repeat;
    opacity: 0.05;
    pointer-events: none;
  }

  .cert-inner::after {
    content: "";
    position: absolute;
    inset: 10px;
    border: 1px solid rgba(254, 198, 0, 0.5);
    border-radius: 6px;
    pointer-events: none;
  }

  /* Corner flourishes */
  .corner { position: absolute; width: 30px; height: 30px; z-index: 1; }
  .corner::before, .corner::after { content: ""; position: absolute; background: var(--gold); }
  .corner::before { top: 0; left: 0; width: 100%; height: 2px; }
  .corner::after { top: 0; left: 0; width: 2px; height: 100%; }
  .corner.tl { top: 22px; left: 22px; }
  .corner.tr { top: 22px; right: 22px; }
  .corner.tr::before, .corner.tr::after { left: auto; right: 0; }
  .corner.bl { bottom: 22px; left: 22px; }
  .corner.bl::before, .corner.bl::after { top: auto; bottom: 0; }
  .corner.br { bottom: 22px; right: 22px; }
  .corner.br::before, .corner.br::after { top: auto; bottom: 0; left: auto; right: 0; }

  /* Header */
  .cert-header { position: relative; margin-bottom: 1.5rem; }
  .cert-logo-img { height: 46px; width: auto; margin: 0 auto 1rem; }
  .cert-subtitle {
    font-size: 0.82rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    margin: 0;
  }

  /* Divider */
  .cert-divider { display: flex; align-items: center; gap: 0.75rem; margin: 0.85rem auto 1rem; max-width: 260px; }
  .line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #03a71a, transparent); }
  .diamond { color: var(--gold-ink); font-size: 0.75rem; }

  /* Body */
  .cert-body { position: relative; margin-bottom: 2rem; }
  .cert-text { font-family: "Playfair Display", Georgia, serif; font-style: italic; font-size: 1rem; color: #4b5563; margin: 0.5rem auto; max-width: 480px; line-height: 1.55; }
  .cert-text.small { font-size: 0.85rem; font-style: normal; color: #6b7280; }
  .cert-name {
    font-size: 2.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0.9rem 0;
    font-family: "Playfair Display", Georgia, serif;
    background: linear-gradient(135deg, #04330d, #03a71a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .cert-degree {
    display: inline-block;
    margin: 1rem 0 0.75rem;
    padding: 0 0.5rem 0.35rem;
    border-bottom: 2px solid var(--gold);
    font-family: "Playfair Display", Georgia, serif;
    font-weight: 700;
    font-size: 1.3rem;
    color: #04330d;
  }

  /* Footer */
  .cert-footer {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 1.5rem;
    padding-top: 1.75rem;
    margin-top: 0.5rem;
    border-top: 1px solid rgba(4, 51, 13, 0.15);
  }
  .cert-signature { text-align: left; }
  .cert-meta { text-align: right; }
  .signature-script {
    display: block;
    font-family: "Great Vibes", cursive;
    font-size: 1.9rem;
    color: #04330d;
    line-height: 1;
    margin-bottom: 0.25rem;
  }
  .signature-line { height: 1px; background: #111827; margin-bottom: 0.3rem; }
  .cert-signature .signature-line, .cert-meta .signature-line { width: 100%; }
  .cert-signature p, .cert-meta p { font-size: 0.85rem; font-weight: 700; color: #111827; margin: 0; }
  .cert-signature small, .cert-meta small { font-size: 0.7rem; color: #9ca3af; }

  /* Seal */
  .cert-seal { display: flex; flex-direction: column; align-items: center; }
  .seal-medal {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 35% 30%, #0e5a1f, #04330d 75%);
    color: var(--gold);
    border: 3px solid var(--gold);
    box-shadow: 0 6px 14px rgba(4, 51, 13, 0.35), inset 0 0 0 3px rgba(254, 198, 0, 0.22);
  }
  .seal-ribbon {
    width: 34px;
    height: 22px;
    margin-top: -3px;
    background: linear-gradient(90deg, #04330d, #03a71a);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%);
  }

  /* Actions */
  .cert-actions { text-align: center; margin-top: 1.5rem; }
  .btn-download {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.7rem 1.5rem;
    border: none;
    border-radius: 10px;
    background: #03a71a;
    color: #fff;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .btn-download:hover { background: #028a15; }

  @media (max-width: 640px) {
    .cert-inner { padding: 2.25rem 1.5rem 2rem; }
    .cert-name { font-size: 1.8rem; }
    .cert-footer { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 1.25rem; }
    .cert-signature, .cert-meta { text-align: center; }
  }

  @media print {
    .no-print { display: none !important; }
    .back-link { display: none !important; }
    .cert-page { padding: 0; }
    .cert-frame { padding: 6px; box-shadow: none; }
    .cert-inner { padding: 2.25rem 2.5rem; }
  }
</style>
