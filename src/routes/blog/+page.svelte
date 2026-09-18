<script lang="ts">
  import Calendar from "@lucide/svelte/icons/calendar";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Seo from "$lib/components/Seo.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const dateLocale = { fr: "fr-FR", en: "en-US" } as const;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale[i18n.locale], { day: "numeric", month: "long", year: "numeric" });
  }
</script>

<Seo
  title="Blog"
  description="Conseils, actualités et ressources sur les métiers du service à domicile : garde d'enfants, aide à domicile, entretien, cuisine — par Trankyl Academy."
/>

<div class="public-page blog-index">
  <div class="editorial-hero">
    <div>
      <span class="eyebrow">{i18n.dict.blog.eyebrow}</span>
      <h1>{i18n.dict.blog.title}</h1>
    </div>
    <p>{i18n.dict.blog.intro}</p>
  </div>

  {#if data.apiError}
    <p class="alert alert-error section">{data.apiError}</p>
  {:else if data.articles.length === 0}
    <div class="empty-state"><p>Aucun article publie pour le moment.</p></div>
  {:else}
    <div class="grid-cards section editorial-grid">
      {#each data.articles as article, index}
        <a class="blog-card" href="/blog/{article.id}">
          <div class="blog-cover" class:has-image={!!article.cover_image_url && article.cover_image_url.startsWith("http")}>
            {#if article.cover_image_url && article.cover_image_url.startsWith("http")}
              <img src={article.cover_image_url} alt="" />
            {:else}
              <span class="cover-index">0{index + 1}</span>
              <BookOpen size={30} />
            {/if}
          </div>
          <div class="blog-card-body">
            {#if article.category}<span class="badge badge-green">{article.category}</span>{/if}
            <h3>{article.title}</h3>
            <p class="muted">{article.excerpt}</p>
            {#if article.published_at}
              <div class="blog-meta">
                <span class="row" style="gap:.25rem"><Calendar size={13} />{formatDate(article.published_at)}</span>
              </div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
