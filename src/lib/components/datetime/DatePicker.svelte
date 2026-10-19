<script lang="ts">
  import { i18n } from "$lib/stores/locale.svelte";
  import Calendar from "./Calendar.svelte";
  import PickerShell from "./PickerShell.svelte";
  import { addMonths, clamp, formatDate, fromIso, todayIso } from "./calendar-utils";

  /** Choix d'une date (« AAAA-MM-JJ ») : calendrier en bulle, remplace le champ date natif du navigateur. */
  let {
    value = $bindable(""),
    min,
    max,
    placeholder,
    id,
    disabled = false,
    required = false,
    invalid = false,
    clearable = false,
    onchange,
    "aria-label": ariaLabel,
  }: {
    value?: string;
    min?: string;
    max?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    clearable?: boolean;
    /** Appele quand l'utilisateur change la date (pas quand `value` est modifiee depuis le code). */
    onchange?: (value: string) => void;
    "aria-label"?: string;
  } = $props();

  const locale = $derived(i18n.locale);
  const en = $derived(locale === "en");
  const today = todayIso();
  let open = $state(false);
  let view = $state(todayIso());
  let focusIso = $state("");
  let token = $state(0);

  const display = $derived(value ? formatDate(value, locale) : "");

  $effect(() => {
    if (open) {
      // Variable locale : relire `view` apres l'avoir ecrit en ferait une dependance de l'effet, qui reinitialiserait la vue
      // a chaque navigation (mois / annee) au lieu de seulement a l'ouverture.
      const start = clamp(fromIso(value) ? value : today, min, max);
      view = start;
      focusIso = start;
    }
  });

  const vy = $derived(Number(view.slice(0, 4)));
  const vm = $derived(Number(view.slice(5, 7)) - 1);

  function set(v: string) {
    value = v;
    onchange?.(v);
  }
  function pick(iso: string) {
    set(iso);
    open = false;
  }
  function move(iso: string) {
    focusIso = iso;
    view = iso;
    token += 1;
  }
</script>

<PickerShell bind:open {display} placeholder={placeholder ?? (en ? "Select a date" : "Choisir une date")} {id} {disabled} {required} {invalid} {clearable} onclear={() => set("")} aria-label={ariaLabel ?? (en ? "Date" : "Date")}>
  <div class="box">
    <Calendar
      year={vy}
      month={vm}
      start={value}
      {min}
      {max}
      {today}
      {locale}
      {focusIso}
      focusToken={token}
      onpick={pick}
      onnav={(d) => (view = addMonths(view, d))}
      onjump={(y, m) => (view = `${y}-${String(m + 1).padStart(2, "0")}-01`)}
      onfocusmove={move}
    />
    <div class="foot">
      <button type="button" disabled={(!!min && today < min) || (!!max && today > max)} onclick={() => pick(today)}>{en ? "Today" : "Aujourd'hui"}</button>
      {#if clearable && value}<button type="button" onclick={() => { set(""); open = false; }}>{en ? "Clear" : "Effacer"}</button>{/if}
    </div>
  </div>
</PickerShell>

<style>
  .box {
    padding: 0.55rem 0.6rem 0.5rem;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    margin-top: 0.3rem;
    padding-top: 0.45rem;
    border-top: 1px solid #f0f0ec;
  }
  .foot button {
    border: 0;
    background: none;
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    color: var(--green, #0f7d41);
    font: inherit;
    font-weight: 800;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .foot button:hover:not(:disabled) {
    background: #f1faf3;
  }
  .foot button:disabled {
    color: #c3c7c4;
    cursor: not-allowed;
  }
</style>
