<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import { localize, localizeList } from "$lib/i18n/localize";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let article = $derived(data.article);

  const dateLocale = { fr: "fr-FR", en: "en-US" } as const;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale[i18n.locale], { day: "numeric", month: "long", year: "numeric" });
  }

  let jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: localize(article.title, article.title_en),
      description: localize(article.excerpt, article.excerpt_en),
      image: article.cover_image_url ?? undefined,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      author: { "@type": "Organization", name: "Trankyl Academy" },
      publisher: { "@type": "Organization", name: "Trankyl Academy" },
      // Echappe les "</" pour eviter qu'un titre/excerpt admin contenant une
      // fermeture de balise script premature ne casse le rendu de la page.
    }).replace(/<\//g, "<\\/")
  );
</script>

<Seo
  title={`${localize(article.title, article.title_en)} — Trankyl Academy`}
  description={localize(article.excerpt, article.excerpt_en)}
  image={article.cover_image_url ?? undefined}
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
    <span class="eyebrow">{localize(article.category, article.category_en)}</span>
    <h1>{localize(article.title, article.title_en)}</h1>
    <div class="blog-meta">
      <span>{formatDate(article.published_at)}</span>
      <span>&middot;</span>
      <span class="row" style="gap:.25rem"><Clock size={13} />{article.read_time}</span>
    </div>
  </div>

  {#if article.cover_image_url}
    <img class="article-hero" src={article.cover_image_url} alt={localize(article.title, article.title_en)} />
  {/if}

  <div class="article-layout section">
    <aside class="article-aside">{i18n.dict.blog.lecture}<br /><strong>{article.read_time}</strong></aside>
    <div class="article-body">
      {#each localizeList(article.content, article.content_en) as paragraph, index}
        <p class:first-paragraph={index === 0}>{paragraph}</p>
      {/each}
    </div>
  </div>
</div>
