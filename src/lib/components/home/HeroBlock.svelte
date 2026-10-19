<script lang="ts">
  import { goto } from "$app/navigation";
  import type { HomeSection } from "$lib/api/home";
  import HeroSlides from "./HeroSlides.svelte";
  import Typewriter from "./Typewriter.svelte";

  let { section, popular, stats, slides }: { section: HomeSection; popular?: HomeSection; stats?: HomeSection; slides?: HomeSection } = $props();

  let query = $state("");
  let p = $derived(section.payload);
  let tw = $derived(p.typewriter ?? {});
  let slideList = $derived((slides?.data?.slides ?? []).filter((s) => (s.audience ?? "client") !== "prestataire"));
  let sp = $derived(slides?.payload ?? {});

  function onSearch(event: SubmitEvent) {
    event.preventDefault();
    const q = query.trim();
    goto(q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche");
  }
</script>

<section class="ac-hero">
  <div class="ac-wrap ac-hero-grid">
    <div class="ac-hero-copy">
      {#if p.badge}<span class="ac-badge"><span class="ac-dot"></span>{p.badge}</span>{/if}
      <h1>
        <Typewriter
          text={section.title ?? ""}
          enabled={tw.enabled !== false}
          speed={Number(tw.speed_ms) || 55}
          eraseSpeed={Number(tw.erase_speed_ms) || 22}
          pause={Number(tw.pause_ms) || 2600}
          loop={tw.loop !== false}
          caret={tw.caret !== false}
        />
      </h1>
      {#if section.subtitle}<p class="ac-lead">{section.subtitle}</p>{/if}

      <form class="ac-search" onsubmit={onSearch}>
        <input type="text" bind:value={query} placeholder={p.search_placeholder} aria-label={p.search_placeholder} />
        <button type="button" class="ac-icon-btn" aria-label="Photo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </button>
        <button type="button" class="ac-icon-btn" aria-label="Micro">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </button>
        <button type="submit" class="ac-find">{p.search_button}</button>
      </form>

      {#if popular && popular.items.length > 0}
        <div class="ac-popular">
          <strong>{popular.payload.popular_label ?? p.popular_label}</strong>
          {#each popular.items as chip}
            <button type="button" class="ac-chip" onclick={() => (query = chip.title ?? "")}>{chip.title}</button>
          {/each}
        </div>
      {/if}

      {#if stats && stats.items.length > 0}
        <dl class="ac-stats">
          {#each stats.items as s}
            <div>
              <dt>{s.data.value}</dt>
              <dd>{s.title}</dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>

    <div class="ac-hero-visual">
      <div class="ac-hero-green"></div>
      {#if slideList.length > 0}
        <div class="ac-slides">
          <HeroSlides
            slides={slideList}
            transition={sp.transition}
            autoplay={sp.autoplay !== false}
            interval={Number(sp.interval_ms) || 4500}
            pauseOnHover={sp.pause_on_hover !== false}
            loop={sp.loop !== false}
            showDots={sp.show_dots !== false}
            showArrows={sp.show_arrows !== false}
            showProgress={sp.show_progress !== false}
            ratio={sp.ratio}
            fit={sp.fit}
            showCaption={sp.show_caption === true}
          />
        </div>
      {/if}
      {#if p.pay_note}
        <div class="ac-pay-note">
          <span class="ac-pay-kicker">{p.pay_note.kicker}</span>
          <p>{p.pay_note.text}</p>
        </div>
      {/if}
    </div>
  </div>
</section>
