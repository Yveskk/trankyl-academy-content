<script lang="ts">
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Users from "@lucide/svelte/icons/users";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import { i18n } from "$lib/stores/locale.svelte";
</script>

<svelte:head>
  <title>A propos — Trankyl Academy</title>
</svelte:head>

<div class="public-page about-page">
  <div class="editorial-hero about-hero">
    <div>
      <span class="eyebrow">{i18n.dict.aPropos.eyebrow}</span>
      <h1>{i18n.dict.aPropos.title}</h1>
    </div>
    <p>{i18n.dict.aPropos.intro}</p>
  </div>

  <div class="grid-2 section about-cards">
  <div class="card about-card">
    <span class="icon-badge"><BookOpen size={24} /></span>
    <h3 style="margin-top:1rem">{i18n.dict.aPropos.missionTitle}</h3>
    <p>{i18n.dict.aPropos.missionText}</p>
  </div>
  <div class="card about-card">
    <span class="icon-badge gold"><ShieldCheck size={24} /></span>
    <h3 style="margin-top:1rem">{i18n.dict.aPropos.linkTitle}</h3>
    <p>{i18n.dict.aPropos.linkText}</p>
  </div>
</div>

<div class="section-alt principles-section">
  <div class="section-inner">
    <div class="section-head">
      <span class="eyebrow">{i18n.dict.aPropos.principlesEyebrow}</span>
      <h2>{i18n.dict.aPropos.principlesTitle}</h2>
    </div>
    <div class="grid-3">
      <div class="value-prop">
        <span class="icon-badge"><GraduationCap size={22} /></span>
        <h3 style="margin-top:1rem">{i18n.dict.aPropos.credit1Title}</h3>
        <p class="muted">{i18n.dict.aPropos.credit1Text}</p>
      </div>
      <div class="value-prop">
        <span class="icon-badge gold"><Users size={22} /></span>
        <h3 style="margin-top:1rem">{i18n.dict.aPropos.credit2Title}</h3>
        <p class="muted">{i18n.dict.aPropos.credit2Text}</p>
      </div>
      <div class="value-prop">
        <span class="icon-badge"><ShieldCheck size={22} /></span>
        <h3 style="margin-top:1rem">{i18n.dict.aPropos.credit3Title}</h3>
        <p class="muted">{i18n.dict.aPropos.credit3Text}</p>
      </div>
    </div>
  </div>
</div>

<section class="cta-band">
  <h2>{i18n.dict.aPropos.ctaTitle}</h2>
  <p>{i18n.dict.aPropos.ctaText}</p>
  <div class="cta-actions">
    <a class="btn btn-gold btn-lg" href="/">{i18n.dict.aPropos.ctaMetiers}</a>
    <a class="btn btn-outline-light btn-lg" href="/register">{i18n.dict.aPropos.ctaSignup}</a>
  </div>
</section>
</div>
