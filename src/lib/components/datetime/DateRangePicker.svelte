<script lang="ts">
  import { i18n } from "$lib/stores/locale.svelte";
  import Calendar from "./Calendar.svelte";
  import PickerShell from "./PickerShell.svelte";
  import { addDays, addMonths, formatDate, fromIso, todayIso } from "./calendar-utils";

  /** Choix d'une periode « du … au … » : deux mois cote a cote, apercu au survol et raccourcis (7 derniers jours, ce mois…). */
  let {
    from = $bindable(""),
    to = $bindable(""),
    min,
    max,
    placeholder,
    id,
    disabled = false,
    clearable = true,
    onchange,
    "aria-label": ariaLabel,
  }: {
    from?: string;
    to?: string;
    min?: string;
    max?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    clearable?: boolean;
    onchange?: (from: string, to: string) => void;
    "aria-label"?: string;
  } = $props();

  const locale = $derived(i18n.locale);
  const en = $derived(locale === "en");
  const today = todayIso();
  let open = $state(false);
  let view = $state(todayIso()); // mois de gauche
  let anchor = $state(""); // 1er clic d'une periode en cours de saisie
  let hover = $state("");
  let focusIso = $state("");
  let token = $state(0);

  const short = (iso: string, withYear: boolean) => formatDate(iso, locale, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
  const display = $derived.by(() => {
    if (from && to) return from === to ? short(from, true) : `${short(from, from.slice(0, 4) !== to.slice(0, 4))} – ${short(to, true)}`;
    if (from) return `${en ? "From" : "Depuis le"} ${short(from, true)}`;
    if (to) return `${en ? "Until" : "Jusqu'au"} ${short(to, true)}`;
    return "";
  });

  $effect(() => {
    if (open) {
      anchor = "";
      hover = "";
      const base = fromIso(from) ? from : fromIso(to) ? addMonths(to, -1) : today;
      view = base;
      focusIso = base;
    }
  });

  const vy = $derived(Number(view.slice(0, 4)));
  const vm = $derived(Number(view.slice(5, 7)) - 1);
  const next = $derived(addMonths(view.slice(0, 7) + "-01", 1));
  const ny = $derived(Number(next.slice(0, 4)));
  const nm = $derived(Number(next.slice(5, 7)) - 1);

  function commit(a: string, b: string) {
    const [f, t] = a <= b ? [a, b] : [b, a];
    from = f;
    to = t;
    onchange?.(f, t);
  }
  function pick(iso: string) {
    if (!anchor) {
      anchor = iso; // 1er clic : la periode n'est validee (et le parent prevenu) qu'au 2e clic
      return;
    }
    commit(anchor, iso);
    anchor = "";
    open = false;
  }
  function clear() {
    from = "";
    to = "";
    anchor = "";
    onchange?.("", "");
  }
  function move(iso: string) {
    focusIso = iso;
    const ym = iso.slice(0, 7);
    if (ym < view.slice(0, 7)) view = iso;
    else if (ym > next.slice(0, 7)) view = addMonths(iso, -1);
    token += 1;
  }

  const monthStart = (iso: string) => iso.slice(0, 7) + "-01";
  const monthEnd = (iso: string) => addDays(addMonths(monthStart(iso), 1), -1);
  const presets = $derived([
    { label: en ? "Today" : "Aujourd'hui", range: () => [today, today] },
    { label: en ? "Last 7 days" : "7 derniers jours", range: () => [addDays(today, -6), today] },
    { label: en ? "Last 30 days" : "30 derniers jours", range: () => [addDays(today, -29), today] },
    { label: en ? "This month" : "Ce mois-ci", range: () => [monthStart(today), monthEnd(today)] },
    { label: en ? "Last month" : "Mois dernier", range: () => [monthStart(addMonths(today, -1)), monthEnd(addMonths(today, -1))] },
  ]);
  function applyPreset(r: () => string[]) {
    const [a, b] = r();
    commit(a, b);
    open = false;
  }
  // Pendant la saisie, la fin provisoire suit la souris ; sinon c'est la periode deja choisie.
  const start = $derived(anchor || from);
  const end = $derived(anchor ? "" : to);
</script>

<PickerShell bind:open {display} placeholder={placeholder ?? (en ? "Select a period" : "Choisir une période")} {id} {disabled} {clearable} onclear={clear} width="min(41.5rem, calc(100vw - 16px))" aria-label={ariaLabel ?? (en ? "Period" : "Période")}>
  <div class="rp">
    <div class="presets">
      {#each presets as p (p.label)}<button type="button" onclick={() => applyPreset(p.range)}>{p.label}</button>{/each}
      {#if from || to}<button type="button" class="clr" onclick={() => { clear(); open = false; }}>{en ? "Clear" : "Effacer"}</button>{/if}
    </div>
    <div class="cals">
      <Calendar year={vy} month={vm} {start} {end} hover={anchor ? hover : ""} {min} {max} {today} {locale} {focusIso} focusToken={token} showNext={false} onpick={pick} onhover={(i) => (hover = i)} onnav={(d) => (view = addMonths(view, d))} onjump={(y, m) => (view = `${y}-${String(m + 1).padStart(2, "0")}-01`)} onfocusmove={move} />
      <Calendar year={ny} month={nm} {start} {end} hover={anchor ? hover : ""} {min} {max} {today} {locale} {focusIso} focusToken={token} showPrev={false} onpick={pick} onhover={(i) => (hover = i)} onnav={(d) => (view = addMonths(view, d))} onjump={(y, m) => (view = addMonths(`${y}-${String(m + 1).padStart(2, "0")}-01`, -1))} onfocusmove={move} />
    </div>
  </div>
</PickerShell>

<style>
  .rp {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
    padding: 0.6rem;
  }
  .presets {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 8.5rem;
    padding-right: 0.7rem;
    border-right: 1px solid #f0f0ec;
  }
  .presets button {
    border: 0;
    background: none;
    padding: 0.5rem 0.65rem;
    border-radius: 9px;
    text-align: left;
    font: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    color: #374151;
    cursor: pointer;
  }
  .presets button:hover {
    background: #f1f2f4;
  }
  .presets .clr {
    margin-top: auto;
    color: var(--green, #0f7d41);
  }
  .cals {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
  }
  @media (max-width: 700px) {
    .presets {
      flex-direction: row;
      flex-wrap: wrap;
      min-width: 0;
      width: 100%;
      padding: 0 0 0.5rem;
      border-right: 0;
      border-bottom: 1px solid #f0f0ec;
    }
    .presets .clr {
      margin-top: 0;
    }
  }
</style>
