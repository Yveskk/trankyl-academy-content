<script lang="ts">
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
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let query = $state("");

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

<div class="hero home-hero">
  <div class="hero-inner home-hero-inner">
    <div class="hero-copy">
      <span class="eyebrow">L'academie des metiers du quotidien</span>
      <h1>Des competences qui prennent soin des autres.</h1>
    <p>
      Apprenez un metier utile, gagnez en confiance et construisez un parcours reconnu par Trankyl.
    </p>

    <form class="search-bar" onsubmit={(e) => e.preventDefault()}>
      <Search size={18} color="var(--muted)" style="margin: 0 .2rem 0 .3rem; flex-shrink:0;" />
      <input type="search" placeholder="Quel metier voulez-vous apprendre ?" bind:value={query} />
      <button class="btn btn-primary" type="submit">Explorer</button>
    </form>

    {#if data.metiers.length > 0}
      <div class="search-suggestions">
        <span class="muted-on-dark">Recherches populaires :</span>
        {#each data.metiers.slice(0, 5) as m}
          <button class="chip" type="button" onclick={() => (query = m.nom)}>{m.nom}</button>
        {/each}
      </div>
    {/if}

    <div class="hero-badges">
      <span class="hero-badge"><Award size={14} />Micro-certifications</span>
      <span class="hero-badge"><Clock size={14} />2 a 3h par module</span>
      <span class="hero-badge"><ShieldCheck size={14} />Reconnu par Trankyl</span>
    </div>
    </div>
    <div class="hero-visual" aria-label="Une professionnelle accompagne une famille">
      <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=85" alt="Une professionnelle accompagne une famille" />
      <div class="hero-note"><Award size={18} /><span><strong>Votre savoir-faire compte</strong><small>Apprenez a votre rythme</small></span></div>
    </div>
  </div>
</div>

{#if data.apiError}
  <p class="alert alert-error section" style="margin-top: 2.5rem;">{data.apiError}</p>
{:else}
  <section class="section careers-section" style="margin-top: 3rem;">
    <div class="section-head">
      <span class="eyebrow">Nos parcours</span>
      <h2>Apprendre un metier, changer de quotidien</h2>
      <p>Des formations concrètes et accessibles pour avancer avec les bons gestes, les bons mots et la bonne confiance.</p>
    </div>

    {#if data.metiers.length === 0}
      <div class="empty-state"><p>Aucun metier publie pour le moment.</p></div>
    {:else if filteredMetiers.length === 0}
      <div class="empty-state"><p>Aucun metier ne correspond a « {query} ».</p></div>
    {:else}
      <div class="grid-cards career-grid">
        {#each filteredMetiers as metier}
          {@const Icon = iconByCode[metier.code] ?? GraduationCap}
          <a class="category-card" href="/metiers/{metier.code}">
            <span class="icon-badge"><Icon size={24} /></span>
            <h3>{metier.nom}</h3>
            {#if metier.description}<p class="muted">{metier.description}</p>{/if}
            <span class="arrow">Voir le parcours <ArrowRight size={14} /></span>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <div class="section-alt process-section">
    <div class="section-inner">
      <div class="section-head">
        <span class="eyebrow">Simple et concret</span>
        <h2>Votre prochain chapitre commence ici</h2>
      </div>
      <div class="grid-3">
        <div class="step-card">
          <span class="step-index">01</span>
          <span class="icon-badge"><Search size={22} /></span>
          <h3 style="margin-top:1rem">Choisissez un metier</h3>
          <p class="muted">Parcourez les niveaux et competences du referentiel.</p>
        </div>
        <div class="step-card">
          <span class="step-index">02</span>
          <span class="icon-badge gold"><GraduationCap size={22} /></span>
          <h3 style="margin-top:1rem">Suivez les modules</h3>
          <p class="muted">Des sessions courtes de 2 a 3h, a votre rythme.</p>
        </div>
        <div class="step-card">
          <span class="step-index">03</span>
          <span class="icon-badge"><Award size={22} /></span>
          <h3 style="margin-top:1rem">Passez le quiz</h3>
          <p class="muted">Validez chaque module et obtenez votre certification.</p>
        </div>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="row" style="justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem;">
      <div class="section-head left" style="margin-bottom:0">
        <span class="eyebrow">Blog</span>
        <h2>Derniers articles</h2>
      </div>
      <a class="row" href="/blog" style="gap:.3rem; font-size:.9rem;">Tout voir <ArrowRight size={14} /></a>
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
    <h2>Pret a commencer ?</h2>
    <p>Creez votre compte apprenant et choisissez votre premier module.</p>
    <div class="cta-actions">
      <a class="btn btn-gold btn-lg" href="/register">Je m'inscris</a>
      <a class="btn btn-outline-light btn-lg" href="/a-propos">En savoir plus</a>
    </div>
  </section>
{/if}
