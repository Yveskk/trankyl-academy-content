<script lang="ts">
  import Mail from "@lucide/svelte/icons/mail";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { i18n } from "$lib/stores/locale.svelte";

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
      <span class="eyebrow">{i18n.dict.contact.eyebrow}</span>
      <h1>{i18n.dict.contact.title}</h1>
    </div>
    <p>{i18n.dict.contact.intro}</p>
  </div>

<div class="grid-2 section contact-grid">
  <div class="card contact-form-card">
    {#if sent}
      <div class="stack" style="align-items:flex-start">
        <span class="icon-badge"><MessageCircle size={24} /></span>
        <h3>{i18n.dict.contact.sentTitle}</h3>
        <p class="muted">{i18n.dict.contact.sentText}</p>
        <button class="btn btn-outline btn-sm" onclick={() => (sent = false)}>{i18n.dict.contact.sendAnother}</button>
      </div>
    {:else}
      <form onsubmit={handleSubmit}>
        <div class="field">
          <label for="contact-name">{i18n.dict.contact.name}</label>
          <input id="contact-name" bind:value={name} required />
        </div>
        <div class="field">
          <label for="contact-email">{i18n.dict.contact.email}</label>
          <input id="contact-email" type="email" bind:value={email} required />
        </div>
        <div class="field">
          <label for="contact-message">{i18n.dict.contact.message}</label>
          <textarea id="contact-message" bind:value={message} required></textarea>
        </div>
        <button class="btn btn-primary" type="submit">{i18n.dict.contact.send}</button>
      </form>
    {/if}
  </div>

  <div class="stack contact-details">
    <div class="card row">
      <span class="icon-badge sm"><Mail size={18} /></span>
      <div>
        <h4 style="margin-bottom:.2rem">{i18n.dict.contact.byEmailTitle}</h4>
        <p class="muted" style="margin:0">{i18n.dict.contact.byEmailText}</p>
      </div>
    </div>
    <div class="card row">
      <span class="icon-badge sm gold"><ExternalLink size={18} /></span>
      <div>
        <h4 style="margin-bottom:.2rem">{i18n.dict.contact.trankylTitle}</h4>
        <p style="margin:0">
          {i18n.dict.contact.trankylTextBefore}
          <a href="https://trankyl.com" target="_blank" rel="noreferrer">Trankyl</a>
          {i18n.dict.contact.trankylTextAfter}
        </p>
      </div>
    </div>
  </div>
</div>
</div>
