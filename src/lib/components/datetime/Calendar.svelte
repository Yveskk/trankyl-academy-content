<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { addDays, addMonths, monthDays, monthName, weekdayLabels } from "./calendar-utils";

  /**
   * Un mois de calendrier (lundi en premier). Sert au choix d'une date et d'une periode.
   * - `start` / `end` : selection (une date : seulement `start`) ; `hover` : fin provisoire d'une periode en cours de saisie.
   * - Clavier : fleches (jour / semaine), Debut / Fin (semaine), PageHaut / PageBas (mois), Entree ou Espace pour choisir.
   * - Vue « mois » : le titre ouvre une grille des mois avec navigation par annee (acces rapide a une date lointaine).
   */
  let {
    year,
    month,
    start = "",
    end = "",
    hover = "",
    min,
    max,
    today,
    locale,
    focusIso = "",
    focusToken = 0,
    showPrev = true,
    showNext = true,
    onpick,
    onhover,
    onnav,
    onjump,
    onfocusmove,
  }: {
    year: number;
    month: number;
    start?: string;
    end?: string;
    hover?: string;
    min?: string;
    max?: string;
    today: string;
    locale: string;
    focusIso?: string;
    /** Incremente a chaque deplacement clavier : le jour `focusIso` recoit alors le focus (meme apres un changement de mois). */
    focusToken?: number;
    showPrev?: boolean;
    showNext?: boolean;
    onpick: (iso: string) => void;
    onhover?: (iso: string) => void;
    onnav: (delta: number) => void;
    onjump: (year: number, month: number) => void;
    onfocusmove: (iso: string) => void;
  } = $props();

  const labels = $derived(weekdayLabels(locale));
  const grid = $derived(monthDays(year, month));
  let months = $state(false);
  let pickYear = $state(0);
  // Grille d'annees (12 par page) : acces direct a une date lointaine (ex. date de naissance) sans cliquer annee par annee.
  let yearsGrid = $state(false);
  let yearsFrom = $state(0);
  let root = $state<HTMLDivElement | undefined>();

  const lo = $derived(end && end < start ? end : start);
  const hi = $derived(end && end < start ? start : end);
  const rangeEnd = $derived(hi || hover);
  const off = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const inside = (iso: string) => !!lo && !!rangeEnd && iso > (lo < rangeEnd ? lo : rangeEnd) && iso < (lo < rangeEnd ? rangeEnd : lo);
  const isEdge = (iso: string) => iso === lo || iso === hi;

  // Le jour qui porte le focus clavier : celui demande, sinon la selection, sinon aujourd'hui, sinon le 1er du mois.
  const tab = $derived.by(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    for (const c of [focusIso, start, today]) if (c && c.startsWith(prefix) && !off(c)) return c;
    return grid.days.find((d) => !off(d)) ?? grid.days[0];
  });

  $effect(() => {
    if (!focusToken || !focusIso || !root || months) return;
    root.querySelector<HTMLButtonElement>(`[data-d="${focusIso}"]`)?.focus();
  });

  function onKey(e: KeyboardEvent) {
    const cur = (e.target as HTMLElement).dataset?.d;
    if (!cur) return;
    const moves: Record<string, string | undefined> = {
      ArrowLeft: addDays(cur, -1),
      ArrowRight: addDays(cur, 1),
      ArrowUp: addDays(cur, -7),
      ArrowDown: addDays(cur, 7),
      PageUp: addMonths(cur, -1),
      PageDown: addMonths(cur, 1),
      Home: addDays(cur, -((new Date(cur + "T12:00:00").getDay() + 6) % 7)),
      End: addDays(cur, 6 - ((new Date(cur + "T12:00:00").getDay() + 6) % 7)),
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    if ((min && next < min) || (max && next > max)) return;
    onfocusmove(next);
  }

  const title = $derived(`${monthName(month, locale)} ${year}`);
  function openMonths() {
    pickYear = year;
    yearsGrid = false;
    months = true;
  }
  function openYears() {
    yearsFrom = pickYear - 5;
    yearsGrid = true;
  }
  const yearOff = (y: number) => (!!min && y < Number(min.slice(0, 4))) || (!!max && y > Number(max.slice(0, 4)));
</script>

<div class="cal" bind:this={root}>
  <div class="head">
    {#if showPrev}<button type="button" class="nav" aria-label={locale === "en" ? "Previous month" : "Mois précédent"} onclick={() => onnav(-1)}><ChevronLeft size={16} /></button>{:else}<span class="nav ghost"></span>{/if}
    <button type="button" class="ttl" onclick={() => (months ? (months = false) : openMonths())} aria-expanded={months}>{months ? pickYear : title}</button>
    {#if showNext}<button type="button" class="nav" aria-label={locale === "en" ? "Next month" : "Mois suivant"} onclick={() => onnav(1)}><ChevronRight size={16} /></button>{:else}<span class="nav ghost"></span>{/if}
  </div>

  {#if months}
    {#if yearsGrid}
      <div class="years">
        <button type="button" class="nav" aria-label="−" onclick={() => (yearsFrom -= 12)}><ChevronLeft size={16} /></button>
        <strong>{yearsFrom} – {yearsFrom + 11}</strong>
        <button type="button" class="nav" aria-label="+" onclick={() => (yearsFrom += 12)}><ChevronRight size={16} /></button>
      </div>
      <div class="months">
        {#each Array(12) as _, i}
          {@const y = yearsFrom + i}
          <button type="button" class:cur={y === pickYear} disabled={yearOff(y)} onclick={() => { pickYear = y; yearsGrid = false; }}>{y}</button>
        {/each}
      </div>
    {:else}
      <div class="years">
        <button type="button" class="nav" aria-label="−" onclick={() => (pickYear -= 1)}><ChevronLeft size={16} /></button>
        <button type="button" class="yr" title={locale === "en" ? "Choose a year" : "Choisir une année"} onclick={openYears}>{pickYear}</button>
        <button type="button" class="nav" aria-label="+" onclick={() => (pickYear += 1)}><ChevronRight size={16} /></button>
      </div>
      <div class="months">
        {#each Array(12) as _, m}
          <button type="button" class:cur={pickYear === year && m === month} onclick={() => { onjump(pickYear, m); months = false; }}>{monthName(m, locale, "short")}</button>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="wk" aria-hidden="true">{#each labels as l}<span>{l}</span>{/each}</div>
    <div class="days" role="grid" tabindex="-1" onkeydown={onKey} onmouseleave={() => onhover?.("")}>
      {#each Array(grid.lead) as _}<span class="blank"></span>{/each}
      {#each grid.days as d (d)}
        {@const edge = isEdge(d)}
        <button
          type="button"
          role="gridcell"
          data-d={d}
          class="day"
          class:today={d === today}
          class:edge
          class:mid={inside(d)}
          class:first={d === lo && !!rangeEnd && rangeEnd !== lo}
          class:last={rangeEnd !== "" && d === (lo < rangeEnd ? rangeEnd : lo) && rangeEnd !== lo}
          disabled={off(d)}
          tabindex={d === tab ? 0 : -1}
          aria-selected={edge || undefined}
          aria-current={d === today ? "date" : undefined}
          aria-label={new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(d + "T12:00:00"))}
          onclick={() => onpick(d)}
          onmouseenter={() => onhover?.(d)}
          onfocus={() => onhover?.(d)}
        >{Number(d.slice(8))}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cal {
    width: 16.5rem;
    padding: 0.2rem;
    user-select: none;
  }
  .head,
  .years {
    display: grid;
    grid-template-columns: 2rem 1fr 2rem;
    align-items: center;
    margin-bottom: 0.35rem;
  }
  .years .yr {
    background: none;
    border: none;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    padding: 0.2rem 0.6rem;
    border-radius: 8px;
    color: inherit;
    text-decoration: underline dotted;
  }
  .years .yr:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  .years strong,
  .ttl {
    text-align: center;
    font-size: 0.92rem;
    font-weight: 800;
    text-transform: capitalize;
  }
  .ttl {
    border: 0;
    background: none;
    padding: 0.3rem 0.4rem;
    border-radius: 8px;
    font: inherit;
    font-weight: 800;
    font-size: 0.92rem;
    cursor: pointer;
    color: inherit;
  }
  .ttl:hover {
    background: #f3f4f6;
  }
  .nav {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 8px;
    background: none;
    color: #374151;
    cursor: pointer;
  }
  .nav:hover:not(.ghost) {
    background: #f3f4f6;
  }
  .nav.ghost {
    cursor: default;
  }
  .wk,
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
  .wk span {
    padding: 0.3rem 0;
    text-align: center;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #9ca3af;
  }
  .day {
    position: relative;
    height: 2.2rem;
    border: 0;
    background: none;
    border-radius: 10px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: #1f2937;
    cursor: pointer;
    transition: background 0.1s;
  }
  .day:hover:not(:disabled):not(.edge) {
    background: #f1f2f4;
  }
  .day:focus-visible {
    outline: 2px solid var(--green, #0f7d41);
    outline-offset: -2px;
  }
  .day:disabled {
    color: #d1d5db;
    cursor: not-allowed;
    text-decoration: line-through;
    text-decoration-color: transparent;
  }
  .day.today:not(.edge) {
    box-shadow: inset 0 0 0 1.5px var(--gold, #ffc72c);
  }
  .day.edge {
    background: var(--green-deep, #04330d);
    color: #fff;
  }
  .day.mid {
    background: var(--green-soft, #e6f7e8);
    border-radius: 0;
  }
  .day.first {
    border-radius: 10px 0 0 10px;
  }
  .day.last {
    border-radius: 0 10px 10px 0;
  }
  .months {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
    padding: 0.3rem 0 0.2rem;
  }
  .months button {
    padding: 0.7rem 0;
    border: 0;
    border-radius: 10px;
    background: #f7f7f5;
    font: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    text-transform: capitalize;
    cursor: pointer;
  }
  .months button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .months button:hover:not(:disabled) {
    background: #eceae2;
  }
  .months button.cur {
    background: var(--green-deep, #04330d);
    color: #fff;
  }
  .blank {
    height: 2.2rem;
  }
</style>
