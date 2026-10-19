<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { HeroSlide } from "$lib/api/home";
  import { i18n } from "$lib/stores/locale.svelte";

  let {
    slides,
    transition = "stack",
    autoplay = true,
    interval = 4500,
    pauseOnHover = true,
    loop = true,
    showDots = true,
    showArrows = true,
    showProgress = true,
    ratio = "16/9",
    fit = "cover",
    showCaption = false,
  }: {
    slides: HeroSlide[];
    transition?: string;
    autoplay?: boolean;
    interval?: number;
    pauseOnHover?: boolean;
    loop?: boolean;
    showDots?: boolean;
    showArrows?: boolean;
    showProgress?: boolean;
    ratio?: string;
    fit?: string;
    showCaption?: boolean;
  } = $props();

  const en = $derived(i18n.locale === "en");
  const FX = ["fade", "slide", "stack", "zoom", "flip", "coverflow"];
  let fx = $derived(FX.includes(transition) ? transition : "stack");
  let n = $derived(slides.length);

  let active = $state(0);
  let hovering = $state(false);
  let hidden = $state(false);
  let reduced = $state(false);
  let dragX = 0;

  // L'index actif doit rester valide quand la liste change (langue, edition admin).
  $effect(() => {
    if (active >= n) active = 0;
  });

  $effect(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onVisibility = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  });

  let running = $derived(autoplay && n > 1 && !reduced && !hidden && !(pauseOnHover && hovering));

  function go(to: number, wrap = true) {
    if (n < 2) return;
    if (!wrap && (to < 0 || to >= n)) return;
    active = ((to % n) + n) % n;
  }
  const next = () => (loop || active < n - 1 ? go(active + 1) : null);
  const prev = () => (loop || active > 0 ? go(active - 1) : null);

  // Defilement automatique : un minuteur par carte (relance a chaque changement).
  $effect(() => {
    if (!running) return;
    void active;
    const timer = setTimeout(() => (loop || active < n - 1 ? go(active + 1) : null), Math.max(1500, interval));
    return () => clearTimeout(timer);
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      next();
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      prev();
      e.preventDefault();
    }
  }
  function onDown(e: PointerEvent) {
    dragX = e.clientX;
  }
  function onUp(e: PointerEvent) {
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
  }

  // Position relative a la carte active : -1 precedente, 0 active, 1 suivante (centree), et rang 0..n-1 pour la pile.
  const rel = (i: number) => {
    let r = (((i - active) % n) + n) % n;
    if (r > n / 2) r -= n;
    return r;
  };
  const pos = (i: number) => (((i - active) % n) + n) % n;
  const css = (r: string) => (/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(r) ? r : "16/9");
</script>

{#if n > 0}
  <div
    class="hs"
    data-fx={fx}
    role="group"
    aria-roledescription="carousel"
    aria-label={en ? "Featured announcements" : "À la une"}
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
    onfocusin={() => (hovering = true)}
    onfocusout={() => (hovering = false)}
  >
    <div class="hs-stage" tabindex="0" role="presentation" onkeydown={onKey} onpointerdown={onDown} onpointerup={onUp}>
      {#each slides as s, i (s.id)}
        {@const r = rel(i)}
        {@const p = pos(i)}
        {@const current = i === active}
        <svelte:element
          this={s.link_url ? "a" : "div"}
          class="hs-slide"
          class:current
          data-rel={r}
          data-pos={p}
          data-total={n}
          data-fly={fx === "stack" && n > 3 && p === n - 1 ? "1" : undefined}
          href={s.link_url ?? undefined}
          style="aspect-ratio: {css(ratio)}"
          aria-roledescription="slide"
          aria-label={s.title ? `${s.title} (${i + 1} / ${n})` : `${i + 1} / ${n}`}
          aria-hidden={current ? undefined : "true"}
          tabindex={current && s.link_url ? 0 : -1}
        >
          <picture>
            {#if s.image_url_mobile}<source media="(max-width: 640px)" srcset={s.image_url_mobile} />{/if}
            <img class="hs-img" class:contain={fit === "contain"} src={s.image_url} alt={s.title ?? ""} loading={i === 0 ? "eager" : "lazy"} draggable="false" />
          </picture>
          {#if (showCaption && (s.title || s.subtitle)) || s.cta_label}
            <span class="hs-foot" class:shaded={showCaption && !!(s.title || s.subtitle)}>
              {#if showCaption && s.title}<span class="hs-cap-title">{s.title}</span>{/if}
              {#if showCaption && s.subtitle}<span class="hs-cap-sub">{s.subtitle}</span>{/if}
              {#if s.cta_label}<span class="hs-cta">{s.cta_label} →</span>{/if}
            </span>
          {/if}
        </svelte:element>
      {/each}
    </div>

    {#if n > 1}
      {#if showArrows}
        <button type="button" class="hs-arrow hs-prev" aria-label={en ? "Previous" : "Précédent"} onclick={prev}><ChevronLeft size={18} /></button>
        <button type="button" class="hs-arrow hs-next" aria-label={en ? "Next" : "Suivant"} onclick={next}><ChevronRight size={18} /></button>
      {/if}
      {#if showDots}
        <div class="hs-nav">
          <div class="hs-dots">
            {#each slides as s, i (s.id)}
              <button type="button" class="hs-dot" class:on={i === active} aria-label="{en ? 'Go to slide' : 'Aller à la carte'} {i + 1}" aria-current={i === active ? "true" : undefined} onclick={() => go(i)}></button>
            {/each}
          </div>
        </div>
      {/if}
      {#if showProgress && autoplay && !reduced}
        {#key active}
          <span class="hs-bar" class:paused={!running} style="animation-duration: {Math.max(1500, interval)}ms" aria-hidden="true"></span>
        {/key}
      {/if}
    {/if}
  </div>
{/if}
