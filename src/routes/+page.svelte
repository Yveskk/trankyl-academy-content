<script lang="ts">
  import { onMount } from "svelte";
  import Award from "@lucide/svelte/icons/award";
  import Baby from "@lucide/svelte/icons/baby";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import Clock from "@lucide/svelte/icons/clock";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import House from "@lucide/svelte/icons/house";
  import Search from "@lucide/svelte/icons/search";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import SprayCan from "@lucide/svelte/icons/spray-can";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import type { Component } from "svelte";
  import { articles } from "$lib/content/blog";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let query = $state("");
  let activeSlide = $state(0);

  let slides = $derived([
    {
      eyebrow: i18n.dict.home.slide1Eyebrow,
      title: i18n.dict.home.slide1Title,
      text: i18n.dict.home.slide1Text,
      image: "https://images.unsplash.com/photo-1504159506876-f8338247a14a?auto=format&fit=crop&w=1200&q=85",
      alt: "Une maman africaine partage un moment avec ses enfants",
      action: i18n.dict.home.slide1Action,
      href: "/register",
    },
    {
      eyebrow: i18n.dict.home.slide2Eyebrow,
      title: i18n.dict.home.slide2Title,
      text: i18n.dict.home.slide2Text,
      image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=85",
      alt: "Une maman accompagne son enfant dans ses apprentissages",
      action: i18n.dict.home.slide2Action,
      href: "/",
    },
    {
      eyebrow: i18n.dict.home.slide3Eyebrow,
      title: i18n.dict.home.slide3Title,
      text: i18n.dict.home.slide3Text,
      image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=85",
      alt: "Des enfants apprennent et grandissent ensemble",
      action: i18n.dict.home.slide3Action,
      href: "/register",
    },
  ]);

  onMount(() => {
    const timer = window.setInterval(() => {
      activeSlide = (activeSlide + 1) % slides.length;
    }, 6000);

    return () => window.clearInterval(timer);
  });

  let filteredMetiers = $derived(
    query.trim() === ""
      ? data.metiers
      : data.metiers.filter((m) =>
          `${m.nom} ${m.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
        )
  );

  const iconByCode: Record<string, Component> = {
    nounou: Baby,
    "aide-domicile": House,
    cuisinier: ChefHat,
    "agent-entretien": SprayCan,
  };
</script>

<svelte:head>
  <title>Trankyl Academy — Formez-vous, faites-vous certifier</title>
</svelte:head>

<section class="home-hero-redesign" aria-label="Presentation de Trankyl Academy">
  <div class="simple-banner">
    {#each slides as slide, index}
      <article class="banner-slide" class:active={activeSlide === index} aria-hidden={activeSlide !== index}>
        <img src={slide.image} alt={slide.alt} />
        <div class="banner-overlay"></div>
        <div class="banner-content">
          <span class="banner-eyebrow">{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
          <a class="btn banner-button" href={slide.href}>{slide.action}<ArrowRight size={16} /></a>
        </div>
      </article>
    {/each}

    <div class="banner-controls">
      <button type="button" class="banner-arrow" aria-label={i18n.dict.home.slidePrecedente} onclick={() => (activeSlide = (activeSlide - 1 + slides.length) % slides.length)}>&larr;</button>
      <div class="banner-dots" aria-label={i18n.dict.home.parcoursEyebrow}>
        {#each slides as _, index}
          <button type="button" class:active={activeSlide === index} aria-label={i18n.dict.home.afficherSlide(index + 1)} aria-current={activeSlide === index} onclick={() => (activeSlide = index)}></button>
        {/each}
      </div>
      <button type="button" class="banner-arrow" aria-label={i18n.dict.home.slideSuivante} onclick={() => (activeSlide = (activeSlide + 1) % slides.length)}>&rarr;</button>
    </div>
  </div>
</section>

{#if data.apiError}
  <p class="alert alert-error section" style="margin-top: 2.5rem;">{data.apiError}</p>
{:else}
  <section class="section careers-section" style="margin-top: 3rem;">
    {#if data.section}
      <div class="section-head">
        <span class="eyebrow">{i18n.dict.home.parcoursEyebrow}</span>
        <h2>{data.section.title}</h2>
        {#if data.section.subtitle}<p>{data.section.subtitle}</p>{/if}
      </div>
    {/if}

    {#if data.metiers.length === 0}
      <div class="empty-state"><p>{i18n.dict.home.noMetiers}</p></div>
    {:else if filteredMetiers.length === 0}
      <div class="empty-state"><p>{i18n.dict.home.noMetiersMatch(query)}</p></div>
    {:else}
      <div class="grid-cards career-grid">
        {#each filteredMetiers as metier}
          {@const Icon = iconByCode[metier.code] ?? GraduationCap}
          <a class="category-card" href="/metiers/{metier.code}">
            <span class="icon-badge"><Icon size={24} /></span>
            <h3>{metier.nom}</h3>
            {#if metier.description}<p class="muted">{metier.description}</p>{/if}
            <span class="arrow">{i18n.dict.home.voirLeParcours} <ArrowRight size={14} /></span>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <div class="section-alt process-section">
    <div class="section-inner">
      <div class="section-head">
        <span class="eyebrow">{i18n.dict.home.simpleEyebrow}</span>
        <h2>{i18n.dict.home.processTitle}</h2>
      </div>
      <div class="grid-3">
        <div class="step-card">
          <span class="step-index">01</span>
          <span class="icon-badge"><Search size={22} /></span>
          <h3 style="margin-top:1rem">{i18n.dict.home.step1Title}</h3>
          <p class="muted">{i18n.dict.home.step1Text}</p>
        </div>
        <div class="step-card">
          <span class="step-index">02</span>
          <span class="icon-badge gold"><GraduationCap size={22} /></span>
          <h3 style="margin-top:1rem">{i18n.dict.home.step2Title}</h3>
          <p class="muted">{i18n.dict.home.step2Text}</p>
        </div>
        <div class="step-card">
          <span class="step-index">03</span>
          <span class="icon-badge"><Award size={22} /></span>
          <h3 style="margin-top:1rem">{i18n.dict.home.step3Title}</h3>
          <p class="muted">{i18n.dict.home.step3Text}</p>
        </div>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="row" style="justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem;">
      <div class="section-head left" style="margin-bottom:0">
        <span class="eyebrow">{i18n.dict.home.blogEyebrow}</span>
        <h2>{i18n.dict.home.derniersArticles}</h2>
      </div>
      <a class="row" href="/blog" style="gap:.3rem; font-size:.9rem;">{i18n.dict.home.toutVoir} <ArrowRight size={14} /></a>
    </div>
    <div class="grid-cards">
      {#each articles.slice(0, 3) as article}
        <a class="blog-card" href="/blog/{article.slug}">
          <div class="blog-cover" class:alt={article.cover === "gold"}>
            <BookOpen size={28} />
          </div>
          <div class="blog-card-body">
            <span class="badge badge-green">{article.category}</span>
            <h3>{article.title}</h3>
            <p class="muted">{article.excerpt}</p>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <section class="cta-band">
    <h2>{i18n.dict.home.ctaTitle}</h2>
    <p>{i18n.dict.home.ctaText}</p>
    <div class="cta-actions">
      <a class="btn btn-gold btn-lg" href="/register">{i18n.dict.home.ctaSignup}</a>
      <a class="btn btn-outline-light btn-lg" href="/a-propos">{i18n.dict.home.ctaLearnMore}</a>
    </div>
  </section>
{/if}
