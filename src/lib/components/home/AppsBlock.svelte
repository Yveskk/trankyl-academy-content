<script lang="ts">
  import type { HomeSection } from "$lib/api/home";

  let { section }: { section: HomeSection } = $props();
  // Badges officiels des stores (memes visuels que le site Trankyl) ; un store sans lien n'est pas affiche.
  const badge = (label: string) => (/google|play/i.test(label) ? "/apps/google-play.svg" : /app\s*store|apple|ios/i.test(label) ? "/apps/app-store.png" : null);
</script>

{#if section.items.length > 0}
  <section class="ac-section ac-section-tight ac-apps-section">
    <div class="ac-wrap ac-apps">
      {#each section.items as app}
        {@const dark = app.tone === "dark"}
        <div class="ac-app {dark ? 'ac-app-dark' : 'ac-app-yellow'}" class:has-shot={!!app.image_url}>
          <div class="ac-app-text">
            <h3>{app.title}{#if app.data.badge} <span class="ac-pill">{app.data.badge}</span>{/if}</h3>
            <p>{app.subtitle}</p>
            <div class="ac-store-row">
              {#each (app.data.stores ?? []).filter((s: { url: string }) => s.url) as store}
                {@const img = badge(store.label)}
                {#if img}
                  <a class="ac-store" href={store.url} target="_blank" rel="noopener noreferrer" aria-label={store.label}><img src={img} alt={store.label} loading="lazy" /></a>
                {:else}
                  <a class="ac-btn {dark ? 'ac-btn-yellow' : 'ac-btn-green'}" href={store.url} target="_blank" rel="noopener noreferrer">{store.label}</a>
                {/if}
              {/each}
            </div>
          </div>
          {#if app.image_url}<img class="ac-app-shot" src={app.image_url} alt="" loading="lazy" />{/if}
        </div>
      {/each}
    </div>
  </section>
{/if}
