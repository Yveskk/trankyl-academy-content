<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { section }: { section: HomeSection } = $props();
</script>

{#if section.items.length > 0}
  <section class="ac-section">
    <div class="ac-wrap">
      <h2>{section.title}</h2>
      <div class="ac-steps">
        {#each section.items as s, i}
          <div class="ac-step">
            <span class="ac-step-n">{i + 1}</span>
            <strong>{s.title}</strong>
            <p>{s.body}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}
