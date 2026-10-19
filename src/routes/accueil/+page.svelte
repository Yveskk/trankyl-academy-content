<script lang="ts">
  import "$lib/components/home/home.css";
  import { getHome, type HomeResponse } from "$lib/api/home";
  import Seo from "$lib/components/Seo.svelte";
  import HeroBlock from "$lib/components/home/HeroBlock.svelte";
  import ServicesBlock from "$lib/components/home/ServicesBlock.svelte";
  import GuaranteesBlock from "$lib/components/home/GuaranteesBlock.svelte";
  import StepsBlock from "$lib/components/home/StepsBlock.svelte";
  import TopProvidersBlock from "$lib/components/home/TopProvidersBlock.svelte";
  import ProBlock from "$lib/components/home/ProBlock.svelte";
  import AcademyNewsBlock from "$lib/components/home/AcademyNewsBlock.svelte";
  import TestimonialsBlock from "$lib/components/home/TestimonialsBlock.svelte";
  import AppsBlock from "$lib/components/home/AppsBlock.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { site } from "$lib/stores/site.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let home = $state<HomeResponse | null>(data.home);
  let error = $state<string | null>(data.error);

  // La langue ou le pays changent apres le chargement (selecteurs de la bande
  // verte) : on redemande la page correspondante.
  $effect(() => {
    const lang = i18n.locale;
    const country = site.country;
    if (home && home.lang === lang && home.country === country) return;
    let cancelled = false;
    getHome(lang, country)
      .then((fresh) => {
        if (!cancelled) {
          home = fresh;
          error = null;
        }
      })
      .catch(() => {
        if (!cancelled && !home) error = i18n.locale === "en" ? "Unable to reach the Trankyl server." : "Impossible de contacter le serveur Trankyl.";
      });
    return () => {
      cancelled = true;
    };
  });

  type Block = "hero" | "services" | "guarantees" | "how_it_works" | "top_providers" | "pro" | "academy_news" | "reviews" | "apps";

  /**
   * L'admin ordonne des SECTIONS ; certaines se rendent ensemble (le hero
   * porte ses puces et ses chiffres, l'academie cote a cote avec les
   * actualites, les avis avec les partenaires). Le bloc prend la place de
   * la premiere section du groupe rencontree dans l'ordre configure.
   */
  function blocksOf(h: HomeResponse): Block[] {
    const blocks: Block[] = [];
    const push = (b: Block) => {
      if (!blocks.includes(b)) blocks.push(b);
    };
    for (const key of h.order) {
      switch (key) {
        case "hero":
        case "services":
        case "guarantees":
        case "how_it_works":
        case "top_providers":
        case "pro":
        case "apps":
          push(key);
          break;
        case "academy":
        case "news":
          push("academy_news");
          break;
        case "testimonials":
        case "partners":
          push("reviews");
          break;
      }
    }
    return blocks;
  }

  let blocks = $derived(home ? blocksOf(home) : []);
  let S = $derived(home?.sections ?? {});
</script>

<Seo
  title={i18n.locale === "en" ? "Home" : "Accueil"}
  description={S.hero?.subtitle ?? "Trankyl : trouvez le bon artisan ou prestataire, vérifié et formé, près de chez vous."}
/>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="ac">
  {#if home}
    {#each blocks as block (block)}
      {#if block === "hero"}
        <HeroBlock section={S.hero} popular={S.popular_searches} stats={S.stats} slides={S.hero_slides} />
      {:else if block === "services"}
        <ServicesBlock section={S.services} />
      {:else if block === "guarantees"}
        <GuaranteesBlock section={S.guarantees} />
      {:else if block === "how_it_works"}
        <StepsBlock section={S.how_it_works} />
      {:else if block === "top_providers"}
        <TopProvidersBlock section={S.top_providers} />
      {:else if block === "pro"}
        <ProBlock section={S.pro} />
      {:else if block === "academy_news"}
        <AcademyNewsBlock academy={S.academy} news={S.news} />
      {:else if block === "reviews"}
        <TestimonialsBlock testimonials={S.testimonials} partners={S.partners} />
      {:else if block === "apps"}
        <AppsBlock section={S.apps} />
      {/if}
    {/each}
  {:else if error}
    <div class="ac-wrap" style="padding: 4rem 0;"><p>{error}</p></div>
  {/if}
</div>
