<script lang="ts">
  import { tick } from "svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import PickerShell from "./PickerShell.svelte";
  import { pad } from "./calendar-utils";

  /** Choix d'une heure (« HH:MM ») : liste de creneaux defilante (pas de `step` minutes), remplace le champ heure natif. */
  let {
    value = $bindable(""),
    step = 15,
    min = "00:00",
    max = "23:59",
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
    step?: number;
    min?: string;
    max?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    clearable?: boolean;
    onchange?: (value: string) => void;
    "aria-label"?: string;
  } = $props();

  const en = $derived(i18n.locale === "en");
  let open = $state(false);
  let list = $state<HTMLDivElement | undefined>();

  const slots = $derived.by(() => {
    const out: string[] = [];
    for (let m = 0; m < 24 * 60; m += Math.max(1, step)) {
      const s = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      if (s >= min && s <= max) out.push(s);
    }
    // Une valeur existante hors grille (ex. 16:07) reste affichee et selectionnable.
    if (value && /^\d{2}:\d{2}$/.test(value) && !out.includes(value)) out.push(value), out.sort();
    return out;
  });

  // A l'ouverture, la liste se centre sur l'heure choisie (sinon sur 09:00).
  $effect(() => {
    if (!open) return;
    tick().then(() => {
      const target = list?.querySelector<HTMLElement>(`[data-t="${value || "09:00"}"]`) ?? list?.querySelector<HTMLElement>("[data-t]");
      if (target && list) list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2;
    });
  });

  function pick(s: string) {
    value = s;
    onchange?.(s);
    open = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const el = (document.activeElement as HTMLElement)?.dataset?.t ? (document.activeElement as HTMLElement) : null;
      const sib = e.key === "ArrowDown" ? el?.nextElementSibling : el?.previousElementSibling;
      (sib as HTMLElement | null)?.focus();
      if (!el) list?.querySelector<HTMLElement>(`[data-t="${value || slots[0]}"]`)?.focus();
    }
  }
</script>

<PickerShell bind:open display={value} placeholder={placeholder ?? (en ? "Select a time" : "Choisir une heure")} icon="clock" {id} {disabled} {required} {invalid} {clearable} onclear={() => { value = ""; onchange?.(""); }} width="9.5rem" aria-label={ariaLabel ?? (en ? "Time" : "Heure")}>
  <div class="tl" bind:this={list} role="listbox" tabindex="-1" onkeydown={onKey}>
    {#each slots as s (s)}
      <button type="button" role="option" data-t={s} aria-selected={s === value} class:on={s === value} onclick={() => pick(s)}>{s}</button>
    {/each}
  </div>
</PickerShell>

<style>
  .tl {
    max-height: 15rem;
    overflow-y: auto;
    padding: 0.35rem;
    display: grid;
    gap: 0.1rem;
    scrollbar-width: thin;
  }
  .tl button {
    border: 0;
    background: none;
    padding: 0.5rem 0.7rem;
    border-radius: 9px;
    font: inherit;
    font-weight: 600;
    font-size: 0.86rem;
    text-align: center;
    color: #1f2937;
    cursor: pointer;
  }
  .tl button:hover {
    background: #f1f2f4;
  }
  .tl button:focus-visible {
    outline: 2px solid var(--green, #0f7d41);
    outline-offset: -2px;
  }
  .tl button.on {
    background: var(--green-deep, #04330d);
    color: #fff;
  }
</style>
