<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import { articles } from "$lib/content/blog";
  import { i18n } from "$lib/stores/locale.svelte";

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
</script>

<svelte:head>
  <title>Blog — Trankyl Academy</title>
</svelte:head>

<div class="public-page blog-index">
  <div class="editorial-hero">
    <div>
      <span class="eyebrow">{i18n.dict.blog.eyebrow}</span>
      <h1>{i18n.dict.blog.title}</h1>
    </div>
    <p>{i18n.dict.blog.intro}</p>
  </div>

  <div class="grid-cards section editorial-grid">
    {#each articles as article, index}
      <a class="blog-card" href="/blog/{article.slug}">
        <div class="blog-cover" class:alt={article.cover === "gold"}>
          <span class="cover-index">0{index + 1}</span>
          <BookOpen size={30} />
        </div>
        <div class="blog-card-body">
          <span class="badge badge-green">{article.category}</span>
          <h3>{article.title}</h3>
          <p class="muted">{article.excerpt}</p>
          <div class="blog-meta">
            <span>{formatDate(article.date)}</span>
            <span>&middot;</span>
            <span class="row" style="gap:.25rem"><Clock size={13} />{article.readTime}</span>
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
