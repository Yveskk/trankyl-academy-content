<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { section }: { section: HomeSection } = $props();
</script>

{#if section.items.length > 0}
  <section class="ac-wrap ac-guarantees-wrap">
    <div class="ac-guarantees">
      {#if section.payload.kicker}<span class="ac-kicker ac-kicker-gold">{section.payload.kicker}</span>{/if}
      <h2>{section.title}</h2>
      <div class="ac-guarantee-grid">
        {#each section.items as g}
          <div class="ac-guarantee">
            <strong>{g.title}</strong>
            <p>{g.body}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}
