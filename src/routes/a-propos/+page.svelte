<script lang="ts">
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Users from "@lucide/svelte/icons/users";
  import BookOpen from "@lucide/svelte/icons/book-open";
</script>

<svelte:head>
  <title>A propos — Trankyl Academy</title>
</svelte:head>

<div class="public-page about-page">
  <div class="editorial-hero about-hero">
    <div>
      <span class="eyebrow">A propos de nous</span>
      <h1>Former, valider, faire confiance.</h1>
    </div>
    <p>Trankyl Academy transforme le savoir-faire des métiers du quotidien en compétences claires, accessibles et vérifiables.</p>
  </div>

  <div class="grid-2 section about-cards">
  <div class="card about-card">
    <span class="icon-badge"><BookOpen size={24} /></span>
    <h3 style="margin-top:1rem">Notre mission</h3>
    <p>
      "Une bonne nounou, c'est quelqu'un qui..." — ce genre de savoir reste souvent informel, transmis oralement,
      difficile a verifier. Nous le transformons en taxonomie de competences ecrite, hierarchisee par niveau, et
      en curriculum concret de micro-modules courts (2 a 3h) avec evaluation.
    </p>
  </div>
  <div class="card about-card">
    <span class="icon-badge gold"><ShieldCheck size={24} /></span>
    <h3 style="margin-top:1rem">Notre lien avec Trankyl</h3>
    <p>
      Trankyl Academy est une plateforme independante : son propre backend, son propre site, sa propre base de
      donnees. Les apprenants ne sont pas (encore) des prestataires Trankyl. L'activation en tant que
      prestataire, une fois certifie, est une etape a venir, geree separement.
    </p>
  </div>
</div>

<div class="section-alt principles-section">
  <div class="section-inner">
    <div class="section-head">
      <span class="eyebrow">Nos principes</span>
      <h2>Une formation pensee pour etre suivie jusqu'au bout</h2>
    </div>
    <div class="grid-3">
      <div class="value-prop">
        <span class="icon-badge"><GraduationCap size={22} /></span>
        <h3 style="margin-top:1rem">Des credits empilables</h3>
        <p class="muted">
          Pas de diplome global d'un coup : chaque module reussi donne un credit precis, qui s'additionne aux
          autres jusqu'a la certification de niveau.
        </p>
      </div>
      <div class="value-prop">
        <span class="icon-badge gold"><Users size={22} /></span>
        <h3 style="margin-top:1rem">Accessible a tous les rythmes</h3>
        <p class="muted">
          2 a 3 heures par module, pour que suivre une formation reste possible meme avec un emploi du temps
          charge ou irregulier.
        </p>
      </div>
      <div class="value-prop">
        <span class="icon-badge"><ShieldCheck size={22} /></span>
        <h3 style="margin-top:1rem">Un contenu ouvert</h3>
        <p class="muted">
          Taxonomie et curriculum sont publies sous licence CC-BY-4.0 : librement reutilisables, a condition de
          nous citer comme source.
        </p>
      </div>
    </div>
  </div>
</div>

<section class="cta-band">
  <h2>Envie de vous former ?</h2>
  <p>Parcourez les metiers disponibles et commencez par le premier module.</p>
  <div class="cta-actions">
    <a class="btn btn-gold btn-lg" href="/">Voir les metiers</a>
    <a class="btn btn-outline-light btn-lg" href="/register">Creer un compte</a>
  </div>
</section>
</div>
