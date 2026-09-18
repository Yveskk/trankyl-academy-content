<script lang="ts">
  import Calendar from "@lucide/svelte/icons/calendar";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let article = $derived(data.article);

  const dateLocale = { fr: "fr-FR", en: "en-US" } as const;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale[i18n.locale], { day: "numeric", month: "long", year: "numeric" });
  }

  let eventDateLabel = $derived.by(() => {
    if (!article.event_start_date) return null;
    if (!article.event_end_date || article.event_end_date === article.event_start_date) {
      return formatDate(article.event_start_date);
    }
    return `${formatDate(article.event_start_date)} → ${formatDate(article.event_end_date)}`;
  });

  let hasImage = $derived(!!article.cover_image_url && article.cover_image_url.startsWith("http"));

  let jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      image: hasImage ? article.cover_image_url : undefined,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: "Trankyl" },
      publisher: { "@type": "Organization", name: "Trankyl" },
      // Echappe les "</" pour eviter qu'un titre/excerpt admin contenant une
      // fermeture de balise script premature ne casse le rendu de la page.
    }).replace(/<\//g, "<\\/")
  );
</script>

<Seo
  title={`${article.title ?? ""} — Trankyl Academy`}
  description={article.excerpt ?? ""}
  image={hasImage ? (article.cover_image_url ?? undefined) : undefined}
  type="article"
/>
<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<div class="public-page article-page">
  <a class="back-link" href="/blog">
    <ArrowLeft size={15} />
    {i18n.dict.blog.tousLesArticles}
  </a>

  <div class="article-header">
    {#if article.category}<span class="eyebrow">{article.category}</span>{/if}
    <h1>{article.title}</h1>
    {#if eventDateLabel}
      <div class="blog-meta">
        <span class="row" style="gap:.25rem"><Calendar size={13} />{eventDateLabel}</span>
      </div>
    {/if}
  </div>

  {#if hasImage}
    <img class="article-hero" src={article.cover_image_url} alt={article.title ?? ""} />
  {/if}

  <div class="article-layout section">
    <div class="article-body">
      {#each article.content as paragraph, index}
        <p class:first-paragraph={index === 0}>{paragraph}</p>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Pas de colonne aside (temps de lecture) pour un evenement : le corps
     de l'article occupe seul la largeur de lecture confortable. */
  .article-layout {
    grid-template-columns: minmax(0, 650px);
  }
</style>
