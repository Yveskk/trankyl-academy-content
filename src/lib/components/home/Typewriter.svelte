<script lang="ts">
  /**
   * Texte ecrit lettre par lettre, puis efface et reecrit si `loop`. Le texte
   * complet reste dans le DOM (lecteurs d'ecran, SEO, hauteur reservee : aucun
   * saut de mise en page) ; l'animation est purement visuelle. Sans animation si
   * l'utilisateur demande moins de mouvement ou si `enabled` est faux.
   */
  let {
    text,
    enabled = true,
    speed = 55,
    eraseSpeed = 22,
    pause = 2600,
    loop = true,
    caret = true,
    highlight = "",
    highlightColor = "inherit",
    caretColor = "",
  }: {
    text: string;
    enabled?: boolean;
    speed?: number;
    eraseSpeed?: number;
    pause?: number;
    loop?: boolean;
    caret?: boolean;
    /** Fin du texte a colorer (ex. "plus de clients.") ; `highlightColor` en donne la couleur. */
    highlight?: string;
    highlightColor?: string;
    caretColor?: string;
  } = $props();

  let mounted = $state(false);
  let count = $state(0);
  let reduced = $state(false);
  let typing = $state(false);
  const chars = $derived([...text]);
  // Indice (en caracteres) a partir duquel le texte est colore ; -1 = aucune partie colorée.
  const hlFrom = $derived.by(() => {
    const at = highlight ? text.indexOf(highlight) : -1;
    return at < 0 ? -1 : [...text.slice(0, at)].length;
  });
  let animate = $derived(mounted && enabled && !reduced);

  $effect(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mounted = true;
  });

  $effect(() => {
    if (!animate) {
      count = chars.length;
      typing = false;
      return;
    }
    const total = chars.length;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    count = 0;

    const type = () => {
      if (!alive) return;
      typing = true;
      if (count < total) {
        count += 1;
        // petite variation naturelle : plus lent apres une ponctuation
        const prev = chars[count - 1];
        timer = setTimeout(type, speed + (",.;:!?".includes(prev) ? speed * 4 : Math.random() * speed * 0.5));
      } else {
        typing = false;
        if (loop) timer = setTimeout(erase, pause);
      }
    };
    const erase = () => {
      if (!alive) return;
      typing = true;
      if (count > 0) {
        count -= 1;
        timer = setTimeout(erase, eraseSpeed);
      } else {
        timer = setTimeout(type, 450);
      }
    };
    timer = setTimeout(type, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  });
</script>

<span class="tw" aria-label={text} class:ready={animate} style="--tw-hl:{highlightColor};{caretColor ? `--tw-caret:${caretColor};` : ""}">
  <!-- Texte complet : visible avant l'hydratation / sans animation, invisible mais present ensuite pour reserver la place. -->
  <span class="tw-ghost" class:hidden={animate} aria-hidden={animate ? "true" : undefined}>{#each chars as ch, i (i)}<span class:tw-hl={hlFrom >= 0 && i >= hlFrom}>{ch}</span>{/each}</span>
  {#if animate}
    <span class="tw-live" aria-hidden="true">{#each chars.slice(0, count) as ch, i (i)}<span class="tw-ch" class:tw-hl={hlFrom >= 0 && i >= hlFrom} class:pop={typing && i === count - 1}>{ch}</span>{/each}{#if caret}<span class="tw-caret" class:blink={!typing}></span>{/if}</span>
  {/if}
</span>

<style>
  .tw {
    position: relative;
    display: block;
  }
  .tw-ghost.hidden {
    visibility: hidden;
  }
  .tw-live {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    pointer-events: none;
  }
  .tw-hl {
    color: var(--tw-hl);
  }
  .tw-ch.pop {
    display: inline-block;
    animation: tw-pop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .tw-caret {
    display: inline-block;
    width: 0.07em;
    height: 0.95em;
    margin-left: 0.06em;
    vertical-align: -0.08em;
    border-radius: 2px;
    background: var(--tw-caret, linear-gradient(180deg, #0f7d41, #0a5a2e));
  }
  .tw-caret.blink {
    animation: tw-blink 0.9s steps(1) infinite;
  }
  @keyframes tw-pop {
    from {
      opacity: 0;
      transform: translateY(0.28em) scale(0.8);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: none;
    }
  }
  @keyframes tw-blink {
    50% {
      opacity: 0;
    }
  }
</style>
