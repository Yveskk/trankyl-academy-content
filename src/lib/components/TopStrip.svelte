<script lang="ts">
  import { getHome, type HomeSection } from "$lib/api/home";
  import { i18n } from "$lib/stores/locale.svelte";
  import { site } from "$lib/stores/site.svelte";

  // Contenu de secours affiche tant que (ou si) le serveur ne repond pas :
  // la bande ne doit jamais sauter ni disparaitre.
  const FALLBACK = {
    countriesLabel: "Pays :",
    countries: [
      { code: "TG", name: "Togo" },
      { code: "CI", name: "Côte d'Ivoire" },
      { code: "BJ", name: "Bénin" },
    ],
    payment: "Paiement : Mixx by Yas · Flooz · Carte",
    helpLabel: "Aide WhatsApp",
    helpUrl: "",
  };

  let topbar = $state<HomeSection | null>(null);

  $effect(() => {
    const lang = i18n.locale;
    const country = site.country;
    let cancelled = false;
    getHome(lang, country)
      .then((h) => {
        if (!cancelled) topbar = h.sections.topbar ?? null;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  type StripCountry = { code: string; name: string; payment_text?: string | null; help_url?: string | null };
  let countries = $derived<StripCountry[]>(topbar?.data?.countries?.length ? topbar.data.countries : FALLBACK.countries);
  let defaultCountry = $derived(topbar?.data?.default_country ?? null);
  let selected = $derived(countries.find((c) => c.code === site.country));

  // Pays memorise qui n'existe plus (supprime/desactive dans l'admin) : retour au pays par defaut.
  $effect(() => {
    if (topbar && countries.length > 0 && !selected) {
      site.setCountry(defaultCountry && countries.some((c) => c.code === defaultCountry) ? defaultCountry : countries[0].code);
    }
  });
  let countriesLabel = $derived(topbar?.payload.countries_label ?? FALLBACK.countriesLabel);
  // Moyens de paiement et aide du pays choisi, a defaut ceux de la section.
  let payment = $derived(selected?.payment_text || (topbar?.payload.payment_text ?? FALLBACK.payment));
  let helpLabel = $derived(topbar?.payload.help_label ?? FALLBACK.helpLabel);
  let helpUrl = $derived(selected?.help_url || (topbar ? (topbar.payload.help_url ?? "") : FALLBACK.helpUrl));
</script>


  <div class="top-strip">
    <div class="top-strip-inner">
      <div class="strip-countries">
        <span class="strip-label">{countriesLabel}</span>
        {#each countries as c}
          <button type="button" class="strip-country" class:active={site.country === c.code} aria-pressed={site.country === c.code} onclick={() => site.setCountry(c.code)}>
            {c.code}<span class="strip-name"> · {c.name}</span>
          </button>
        {/each}
      </div>
      <div class="strip-right">
        <span class="strip-pay">{payment}</span>
        <span class="strip-lang">
          <button type="button" class:active={i18n.locale === "fr"} onclick={() => i18n.set("fr")}>FR</button>
          <span class="strip-sep"></span>
          <button type="button" class:active={i18n.locale === "en"} onclick={() => i18n.set("en")}>EN</button>
        </span>
        {#if helpUrl}<a class="strip-help" href={helpUrl} target="_blank" rel="noopener">{helpLabel}</a>{/if}
      </div>
    </div>
  </div>

<style>
  .top-strip {
    background: #0a5a2e;
    color: rgba(255, 255, 255, 0.92);
    font-size: 0.8rem;
  }
  .top-strip-inner {
    width: min(1480px, 100% - clamp(2.5rem, 7vw, 8rem));
    margin-inline: auto;
    min-height: 2.7rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .strip-countries,
  .strip-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .strip-right {
    gap: 1.1rem;
  }
  .strip-label {
    margin-right: 0.2rem;
  }
  .strip-country {
    border: 1px solid rgba(255, 255, 255, 0.45);
    background: transparent;
    color: #fff;
    border-radius: 999px;
    padding: 0.28rem 0.8rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .strip-country:hover {
    border-color: #fff;
  }
  .strip-country.active {
    background: #ffc629;
    border-color: #ffc629;
    color: #1b2620;
    font-weight: 700;
  }
  .strip-lang {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .strip-lang button {
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font: inherit;
    padding: 0;
    cursor: pointer;
  }
  .strip-lang button.active {
    color: #fff;
    font-weight: 700;
  }
  .strip-sep {
    width: 1px;
    height: 0.9rem;
    background: #ffc629;
  }
  .strip-help {
    color: #ffc629;
    font-weight: 700;
    text-decoration: none;
  }
  .strip-help:hover {
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .strip-pay,
    .strip-label {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .top-strip-inner {
      width: calc(100% - 1.5rem);
      min-height: 2.4rem;
    }
    .strip-name {
      display: none;
    }
    .strip-country {
      padding: 0.25rem 0.65rem;
    }
    .strip-right {
      gap: 0.8rem;
    }
  }
</style>
