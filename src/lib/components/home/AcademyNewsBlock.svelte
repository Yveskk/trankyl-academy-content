<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { academy, news }: { academy?: HomeSection; news?: HomeSection } = $props();
  let articles = $derived(news?.data?.articles ?? []);
  let showNews = $derived(!!news && articles.length > 0);
</script>

{#if academy || showNews}
  <section class="ac-section ac-section-tight">
    <div class="ac-wrap ac-academy-grid" class:ac-single={!academy || !showNews}>
      {#if academy}
        <div class="ac-academy">
          {#if academy.payload.kicker}<span class="ac-kicker ac-kicker-ink">{academy.payload.kicker}</span>{/if}
          <h2>{academy.title}</h2>
          {#if academy.payload.text}<p>{academy.payload.text}</p>{/if}
          {#if academy.payload.cta_label}<a class="ac-btn ac-btn-dark" href={academy.payload.cta_url || "/metiers"}>{academy.payload.cta_label}</a>{/if}
        </div>
      {/if}
      {#if news && showNews}
        <div class="ac-news">
          <div class="ac-head ac-head-small">
            <h3>{news.title}</h3>
            {#if news.payload.link_label}<a class="ac-link" href={news.payload.link_url || "/blog"}>{news.payload.link_label}</a>{/if}
          </div>
          {#each articles as n}
            <a class="ac-news-item" href={n.link_url}>
              {#if n.image_url}
                <img class="ac-news-thumb ac-news-thumb-img" src={n.image_url} alt="" loading="lazy" />
              {:else}
                <span class="ac-news-thumb"></span>
              {/if}
              <span>
                {#if n.category}<span class="ac-news-tag">{n.category}</span>{/if}
                <strong>{n.title}</strong>
              </span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
