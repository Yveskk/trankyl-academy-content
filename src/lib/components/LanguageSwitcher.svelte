<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { i18n, type Locale } from "$lib/stores/locale.svelte";

  const locales: { code: Locale; label: string; flag: string }[] = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  function handleChange(event: Event) {
    i18n.set((event.currentTarget as HTMLSelectElement).value as Locale);
  }
</script>

<div class="lang-switcher">
  <select value={i18n.locale} onchange={handleChange} aria-label="Choisir la langue / Language">
    {#each locales as loc}
      <option value={loc.code}>{loc.flag} {loc.label}</option>
    {/each}
  </select>
  <ChevronDown size={13} class="lang-chevron" />
</div>

<style>
  .lang-switcher {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 1.5rem 0.3rem 0.65rem;
    border-radius: 999px;
    background: rgba(4, 51, 13, 0.06);
    transition: background 0.15s;
  }

  .lang-switcher:hover {
    background: rgba(4, 51, 13, 0.1);
  }

  select {
    appearance: none;
    -webkit-appearance: none;
    border: none;
    background: none;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--ink-soft);
    cursor: pointer;
    padding: 0;
    padding-right: 0.9rem;
  }

  select:focus {
    outline: none;
    color: var(--green-dark);
  }

  select:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 2px;
    border-radius: 4px;
  }

  :global(.lang-chevron) {
    position: absolute;
    right: 0.55rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-soft);
    pointer-events: none;
  }
</style>
