<script lang="ts">
  import type { HomeItem, HomeSection } from "$lib/api/home";

  let { testimonials, partners }: { testimonials?: HomeSection; partners?: HomeSection } = $props();
  let reviews = $derived(testimonials?.data?.reviews ?? []);
  const of = (kind: string) => partners?.items.filter((i) => i.kind === kind) ?? [];
  let supporters = $derived(of("supporter"));
  let press = $derived(of("press"));
  let hasPartners = $derived(supporters.length + press.length > 0);
</script>

{#snippet logo(it: HomeItem)}
  {#if it.link_url}
    <a class="ac-logo" href={it.link_url} target="_blank" rel="noopener noreferrer" title={it.title ?? ""}>
      {#if it.image_url}<img src={it.image_url} alt={it.title ?? ""} loading="lazy" />{:else}<strong>{it.title}</strong>{/if}
    </a>
  {:else}
    <span class="ac-logo" title={it.title ?? ""}>
      {#if it.image_url}<img src={it.image_url} alt={it.title ?? ""} loading="lazy" />{:else}<strong>{it.title}</strong>{/if}
    </span>
  {/if}
{/snippet}

{#if reviews.length > 0 || hasPartners}
  <section class="ac-cream ac-reviews-section">
    <div class="ac-wrap">
      {#if reviews.length > 0 && testimonials}
        <h2>{testimonials.title}</h2>
        <div class="ac-reviews">
          {#each reviews as r}
            <figure class="ac-review">
              <div class="ac-stars" aria-label="{r.rating}/5">{"★".repeat(r.rating)}</div>
              <blockquote>« {r.text} »</blockquote>
              <figcaption>{r.author}{#if !r.manual} · <strong>{testimonials.payload.verified_label}</strong>{/if}</figcaption>
            </figure>
          {/each}
        </div>
      {/if}
      {#if partners && hasPartners}
        <div class="ac-partners">
          {#if supporters.length > 0}
            <h3 class="ac-partners-title">{partners.payload.supported_label}</h3>
            <div class="ac-logos">{#each supporters as s}{@render logo(s)}{/each}</div>
          {/if}
          {#if press.length > 0}
            <h3 class="ac-partners-title">{partners.payload.press_label}</h3>
            <div class="ac-logos ac-logos-press">{#each press as s}{@render logo(s)}{/each}</div>
          {/if}
        </div>
      {/if}
    </div>
  </section>
{/if}
