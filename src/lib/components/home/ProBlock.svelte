<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { section }: { section: HomeSection } = $props();
  let p = $derived(section.payload);
</script>

<section class="ac-section ac-section-tight">
  <div class="ac-wrap">
    <div class="ac-pro">
      <div class="ac-pro-copy">
        {#if p.kicker}<span class="ac-kicker ac-kicker-gold">{p.kicker}</span>{/if}
        <h2>{section.title}</h2>
        {#if p.text}<p>{p.text}</p>{/if}
        <div class="ac-cta-row">
          {#if p.primary_label}<a class="ac-btn ac-btn-yellow" href={p.primary_url || "/register"}>{p.primary_label}</a>{/if}
          {#if p.secondary_label}<a class="ac-btn ac-btn-outline" href={p.secondary_url || "/metiers"}>{p.secondary_label}</a>{/if}
        </div>
      </div>
      {#if section.items.length > 0}
        <div class="ac-pro-features">
          {#each section.items as f}
            <div class="ac-feature" class:ac-feature-hl={f.tone === "highlight"}>
              <strong>{f.title}</strong>
              <span>{f.subtitle}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</section>
