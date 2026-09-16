<script lang="ts">
  import Mail from "@lucide/svelte/icons/mail";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  let name = $state("");
  let email = $state("");
  let message = $state("");
  let sent = $state(false);

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    // Pas de backend pour l'instant : confirmation locale uniquement.
    sent = true;
  }
</script>

<svelte:head>
  <title>Contact — Trankyl Academy</title>
</svelte:head>

<div class="public-page contact-page">
  <div class="editorial-hero contact-hero">
    <div>
      <span class="eyebrow">Parlons-en</span>
      <h1>Une question ? Ecrivez-nous.</h1>
    </div>
    <p>Une formation, une certification ou un métier à proposer ? Notre équipe vous répond.</p>
  </div>

<div class="grid-2 section contact-grid">
  <div class="card contact-form-card">
    {#if sent}
      <div class="stack" style="align-items:flex-start">
        <span class="icon-badge"><MessageCircle size={24} /></span>
        <h3>Message envoye</h3>
        <p class="muted">
          Merci, votre message a bien ete pris en compte. (Demonstration statique : aucun envoi reel n'est
          effectue pour le moment.)
        </p>
        <button class="btn btn-outline btn-sm" onclick={() => (sent = false)}>Envoyer un autre message</button>
      </div>
    {:else}
      <form onsubmit={handleSubmit}>
        <div class="field">
          <label for="contact-name">Nom</label>
          <input id="contact-name" bind:value={name} required />
        </div>
        <div class="field">
          <label for="contact-email">Email</label>
          <input id="contact-email" type="email" bind:value={email} required />
        </div>
        <div class="field">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" bind:value={message} required></textarea>
        </div>
        <button class="btn btn-primary" type="submit">Envoyer</button>
      </form>
    {/if}
  </div>

  <div class="stack contact-details">
    <div class="card row">
      <span class="icon-badge sm"><Mail size={18} /></span>
      <div>
        <h4 style="margin-bottom:.2rem">Par email</h4>
        <p class="muted" style="margin:0">Passez par le formulaire ci-contre, on vous repond rapidement.</p>
      </div>
    </div>
    <div class="card row">
      <span class="icon-badge sm gold"><ExternalLink size={18} /></span>
      <div>
        <h4 style="margin-bottom:.2rem">Trankyl</h4>
        <p style="margin:0">
          Trankyl Academy fait partie de l'ecosysteme
          <a href="https://trankyl.com" target="_blank" rel="noreferrer">Trankyl</a>.
        </p>
      </div>
    </div>
  </div>
</div>
</div>
