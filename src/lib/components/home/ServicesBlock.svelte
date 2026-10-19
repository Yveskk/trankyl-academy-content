<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { section }: { section: HomeSection } = $props();
</script>

{#if section.items.length > 0}
  <section class="ac-section">
    <div class="ac-wrap">
      <div class="ac-head">
        <h2>{section.title}</h2>
        {#if section.payload.link_label}<a class="ac-link" href={!section.payload.link_url || section.payload.link_url === "/metiers" ? "/categories" : section.payload.link_url}>{section.payload.link_label}</a>{/if}
      </div>
      <div class="ac-services">
        {#each section.items as s}
          <a class="ac-service" href={s.link_url || "/recherche?q=" + encodeURIComponent(s.title ?? "")}>
            <span class="ac-ico ac-tone-{s.tone}">{s.code ?? s.title?.slice(0, 2)}</span>
            <strong>{s.title}</strong>
            {#if s.subtitle}<span>{s.subtitle}</span>{/if}
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
