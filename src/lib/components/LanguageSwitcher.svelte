<script lang="ts">
  import { i18n, type Locale } from "$lib/stores/locale.svelte";

  const locales: { code: Locale; label: string }[] = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];
</script>

<div class="lang-switcher" role="group" aria-label="Choisir la langue / Language / Idioma">
  {#each locales as loc}
    <button
      type="button"
      class:active={i18n.locale === loc.code}
      aria-pressed={i18n.locale === loc.code}
      onclick={() => i18n.set(loc.code)}
    >
      {loc.label}
    </button>
  {/each}
</div>

<style>
  .lang-switcher {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.2rem;
    border-radius: 999px;
    background: rgba(4, 51, 13, 0.06);
  }

  .lang-switcher button {
    border: none;
    background: none;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    padding: 0.3rem 0.55rem;
    border-radius: 999px;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
  }

  .lang-switcher button:hover {
    color: var(--green-dark);
  }

  .lang-switcher button.active {
    background: var(--green);
    color: #fff;
  }
</style>
