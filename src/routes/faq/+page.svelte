<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { faqItems } from "$lib/content/faq";

  let openIndex = $state<number | null>(0);

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }
</script>

<svelte:head>
  <title>FAQ — Trankyl Academy</title>
</svelte:head>

<div class="public-page faq-page">
  <div class="editorial-hero faq-hero">
    <div>
      <span class="eyebrow">Besoin d'y voir clair ?</span>
      <h1>Questions frequentes.</h1>
    </div>
    <p>Les réponses essentielles sur les formations, les certifications et le lien avec Trankyl.</p>
  </div>

<div class="section-narrow section faq-list">
  {#each faqItems as item, index}
    <div class="faq-item" class:open={openIndex === index}>
      <button class="faq-question" onclick={() => toggle(index)} aria-expanded={openIndex === index}>
        {item.question}
        <ChevronDown size={18} class="chevron" />
      </button>
      {#if openIndex === index}
        <div class="faq-answer">{item.answer}</div>
      {/if}
    </div>
  {/each}
</div>

<section class="cta-band">
  <h2>Une autre question ?</h2>
  <p>Notre equipe repond volontiers a toute question sur les formations ou la plateforme.</p>
  <a class="btn btn-gold btn-lg" href="/contact">Nous contacter</a>
</section>
</div>
