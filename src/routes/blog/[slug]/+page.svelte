<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let article = $derived(data.article);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
</script>

<svelte:head>
  <title>{article.title} — Trankyl Academy</title>
</svelte:head>

<div class="public-page article-page">
  <a class="back-link" href="/blog">
    <ArrowLeft size={15} />
    Tous les articles
  </a>

  <div class="article-header">
    <span class="eyebrow">{article.category}</span>
    <h1>{article.title}</h1>
    <div class="blog-meta">
      <span>{formatDate(article.date)}</span>
      <span>&middot;</span>
      <span class="row" style="gap:.25rem"><Clock size={13} />{article.readTime}</span>
    </div>
  </div>

  <div class="article-layout section">
    <aside class="article-aside">Lecture<br /><strong>{article.readTime}</strong></aside>
    <div class="article-body">
      {#each article.content as paragraph, index}
        <p class:first-paragraph={index === 0}>{paragraph}</p>
      {/each}
    </div>
  </div>
</div>
