<script lang="ts">
  import { tick } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Search from "@lucide/svelte/icons/search";
  // Indicatif du numero de telephone : n'importe quel pays est valide ici
  // (comme les vraies apps vendor/client Trankyl, qui utilisent un picker
  // pays complet). A ne pas confondre avec `countries.country_has_service`
  // en base, qui ne concerne que le pays ou une prestation est realisee, pas
  // le pays d'origine du numero de telephone de la personne qui s'inscrit.
  // Togo/Benin/Cote d'Ivoire/France en tete de liste (mêmes pays "preferes"
  // que le picker des vraies apps), reste trie par ordre alphabetique.
  function flagEmoji(iso2: string) {
    return iso2
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  }

  const RAW: Array<[string, string, string]> = [
    // [iso2, indicatif, nom] — pays preferes en premier
    ["TG", "228", "Togo"],
    ["BJ", "229", "Bénin"],
    ["CI", "225", "Côte d'Ivoire"],
    ["FR", "33", "France"],
    ["AF", "93", "Afghanistan"],
    ["ZA", "27", "Afrique du Sud"],
    ["AL", "355", "Albanie"],
    ["DZ", "213", "Algérie"],
    ["DE", "49", "Allemagne"],
    ["AD", "376", "Andorre"],
    ["AO", "244", "Angola"],
    ["SA", "966", "Arabie saoudite"],
    ["AR", "54", "Argentine"],
    ["AM", "374", "Arménie"],
    ["AU", "61", "Australie"],
    ["AT", "43", "Autriche"],
    ["AZ", "994", "Azerbaïdjan"],
    ["BS", "1", "Bahamas"],
    ["BH", "973", "Bahreïn"],
    ["BD", "880", "Bangladesh"],
    ["BB", "1", "Barbade"],
    ["BE", "32", "Belgique"],
    ["BZ", "501", "Belize"],
    ["BY", "375", "Biélorussie"],
    ["MM", "95", "Birmanie"],
    ["BO", "591", "Bolivie"],
    ["BA", "387", "Bosnie-Herzégovine"],
    ["BW", "267", "Botswana"],
    ["BR", "55", "Brésil"],
    ["BN", "673", "Brunei"],
    ["BG", "359", "Bulgarie"],
    ["BF", "226", "Burkina Faso"],
    ["BI", "257", "Burundi"],
    ["KH", "855", "Cambodge"],
    ["CM", "237", "Cameroun"],
    ["CA", "1", "Canada"],
    ["CV", "238", "Cap-Vert"],
    ["CL", "56", "Chili"],
    ["CN", "86", "Chine"],
    ["CY", "357", "Chypre"],
    ["CO", "57", "Colombie"],
    ["KM", "269", "Comores"],
    ["CG", "242", "Congo-Brazzaville"],
    ["CD", "243", "Congo-Kinshasa"],
    ["KR", "82", "Corée du Sud"],
    ["KP", "850", "Corée du Nord"],
    ["CR", "506", "Costa Rica"],
    ["HR", "385", "Croatie"],
    ["CU", "53", "Cuba"],
    ["DK", "45", "Danemark"],
    ["DJ", "253", "Djibouti"],
    ["EG", "20", "Égypte"],
    ["AE", "971", "Émirats arabes unis"],
    ["EC", "593", "Équateur"],
    ["ER", "291", "Érythrée"],
    ["ES", "34", "Espagne"],
    ["EE", "372", "Estonie"],
    ["SZ", "268", "Eswatini"],
    ["US", "1", "États-Unis"],
    ["ET", "251", "Éthiopie"],
    ["FJ", "679", "Fidji"],
    ["FI", "358", "Finlande"],
    ["GA", "241", "Gabon"],
    ["GM", "220", "Gambie"],
    ["GE", "995", "Géorgie"],
    ["GH", "233", "Ghana"],
    ["GR", "30", "Grèce"],
    ["GD", "1", "Grenade"],
    ["GT", "502", "Guatemala"],
    ["GN", "224", "Guinée"],
    ["GW", "245", "Guinée-Bissau"],
    ["GQ", "240", "Guinée équatoriale"],
    ["GY", "592", "Guyana"],
    ["HT", "509", "Haïti"],
    ["HN", "504", "Honduras"],
    ["HU", "36", "Hongrie"],
    ["IN", "91", "Inde"],
    ["ID", "62", "Indonésie"],
    ["IQ", "964", "Irak"],
    ["IR", "98", "Iran"],
    ["IE", "353", "Irlande"],
    ["IS", "354", "Islande"],
    ["IL", "972", "Israël"],
    ["IT", "39", "Italie"],
    ["JM", "1", "Jamaïque"],
    ["JP", "81", "Japon"],
    ["JO", "962", "Jordanie"],
    ["KZ", "7", "Kazakhstan"],
    ["KE", "254", "Kenya"],
    ["KG", "996", "Kirghizistan"],
    ["KI", "686", "Kiribati"],
    ["KW", "965", "Koweït"],
    ["LA", "856", "Laos"],
    ["LS", "266", "Lesotho"],
    ["LV", "371", "Lettonie"],
    ["LB", "961", "Liban"],
    ["LR", "231", "Liberia"],
    ["LY", "218", "Libye"],
    ["LI", "423", "Liechtenstein"],
    ["LT", "370", "Lituanie"],
    ["LU", "352", "Luxembourg"],
    ["MK", "389", "Macédoine du Nord"],
    ["MG", "261", "Madagascar"],
    ["MY", "60", "Malaisie"],
    ["MW", "265", "Malawi"],
    ["MV", "960", "Maldives"],
    ["ML", "223", "Mali"],
    ["MT", "356", "Malte"],
    ["MA", "212", "Maroc"],
    ["MU", "230", "Maurice"],
    ["MR", "222", "Mauritanie"],
    ["MX", "52", "Mexique"],
    ["MD", "373", "Moldavie"],
    ["MC", "377", "Monaco"],
    ["MN", "976", "Mongolie"],
    ["ME", "382", "Monténégro"],
    ["MZ", "258", "Mozambique"],
    ["NA", "264", "Namibie"],
    ["NP", "977", "Népal"],
    ["NI", "505", "Nicaragua"],
    ["NE", "227", "Niger"],
    ["NG", "234", "Nigeria"],
    ["NO", "47", "Norvège"],
    ["NZ", "64", "Nouvelle-Zélande"],
    ["OM", "968", "Oman"],
    ["UG", "256", "Ouganda"],
    ["UZ", "998", "Ouzbékistan"],
    ["PK", "92", "Pakistan"],
    ["PA", "507", "Panama"],
    ["PG", "675", "Papouasie-Nouvelle-Guinée"],
    ["PY", "595", "Paraguay"],
    ["NL", "31", "Pays-Bas"],
    ["PE", "51", "Pérou"],
    ["PH", "63", "Philippines"],
    ["PL", "48", "Pologne"],
    ["PT", "351", "Portugal"],
    ["QA", "974", "Qatar"],
    ["CF", "236", "République centrafricaine"],
    ["DO", "1", "République dominicaine"],
    ["CZ", "420", "République tchèque"],
    ["RO", "40", "Roumanie"],
    ["GB", "44", "Royaume-Uni"],
    ["RU", "7", "Russie"],
    ["RW", "250", "Rwanda"],
    ["WS", "685", "Samoa"],
    ["ST", "239", "Sao Tomé-et-Principe"],
    ["SN", "221", "Sénégal"],
    ["RS", "381", "Serbie"],
    ["SC", "248", "Seychelles"],
    ["SL", "232", "Sierra Leone"],
    ["SG", "65", "Singapour"],
    ["SK", "421", "Slovaquie"],
    ["SI", "386", "Slovénie"],
    ["SO", "252", "Somalie"],
    ["SD", "249", "Soudan"],
    ["SS", "211", "Soudan du Sud"],
    ["LK", "94", "Sri Lanka"],
    ["SE", "46", "Suède"],
    ["CH", "41", "Suisse"],
    ["SR", "597", "Suriname"],
    ["SY", "963", "Syrie"],
    ["TJ", "992", "Tadjikistan"],
    ["TW", "886", "Taïwan"],
    ["TZ", "255", "Tanzanie"],
    ["TD", "235", "Tchad"],
    ["TH", "66", "Thaïlande"],
    ["TL", "670", "Timor oriental"],
    ["TN", "216", "Tunisie"],
    ["TM", "993", "Turkménistan"],
    ["TR", "90", "Turquie"],
    ["UA", "380", "Ukraine"],
    ["UY", "598", "Uruguay"],
    ["VU", "678", "Vanuatu"],
    ["VE", "58", "Venezuela"],
    ["VN", "84", "Vietnam"],
    ["YE", "967", "Yémen"],
    ["ZM", "260", "Zambie"],
    ["ZW", "263", "Zimbabwe"],
  ];

  const COUNTRIES = RAW.map(([iso2, code, name]) => ({ iso2, code, name, flag: flagEmoji(iso2) }));
  type Country = (typeof COUNTRIES)[number];
  const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  let {
    countryCode = $bindable("228"),
    phone = $bindable(""),
    label,
    id = "phone",
    required = true,
    invalid = false,
  }: {
    countryCode: string;
    phone: string;
    label: string;
    id?: string;
    required?: boolean;
    invalid?: boolean;
  } = $props();

  // Liste deroulante avec recherche (nom du pays, indicatif ou code ISO ; accents ignores), clavier complet.
  let open = $state(false);
  let query = $state("");
  let active = $state(0);
  let root = $state<HTMLDivElement | undefined>();
  let searchEl = $state<HTMLInputElement | undefined>();
  let listEl = $state<HTMLUListElement | undefined>();

  // Plusieurs pays partagent un indicatif (ex. +1) : on retient le premier de la liste pour l'affichage.
  const current = $derived(COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0]);
  const filtered = $derived.by(() => {
    const q = norm(query).replace(/^\+/, "");
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => norm(c.name).includes(q) || c.code.startsWith(q) || c.iso2.toLowerCase() === q);
  });
  $effect(() => {
    void query;
    active = 0;
  });

  async function toggle() {
    open = !open;
    if (open) {
      query = "";
      active = Math.max(0, COUNTRIES.findIndex((c) => c.code === countryCode));
      await tick();
      searchEl?.focus();
      listEl?.querySelector<HTMLElement>(".active")?.scrollIntoView({ block: "nearest" });
    }
  }
  function close(refocus = true) {
    open = false;
    if (refocus) root?.querySelector<HTMLButtonElement>(".dial")?.focus();
  }
  function pick(c: Country) {
    countryCode = c.code;
    close();
  }
  function scrollToActive() {
    tick().then(() => listEl?.querySelector<HTMLElement>(".active")?.scrollIntoView({ block: "nearest" }));
  }
  function onSearchKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(filtered.length - 1, active + 1);
      scrollToActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, active - 1);
      scrollToActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }
  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      toggle();
    }
  }
  function onOutside(e: PointerEvent) {
    if (open && root && !root.contains(e.target as Node)) close(false);
  }
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="phone-field" class:invalid class:open bind:this={root}>
    <button type="button" class="dial" aria-haspopup="listbox" aria-expanded={open} aria-label="Indicatif pays : {current.name} +{current.code}" onclick={toggle} onkeydown={onTriggerKey}>
      <span class="flag" aria-hidden="true">{current.flag}</span>
      <span class="code">+{current.code}</span>
      <ChevronDown size={15} />
    </button>
    <input {id} type="tel" inputmode="tel" autocomplete="tel-national" placeholder="90 00 00 00" bind:value={phone} {required} maxlength="20" aria-invalid={invalid || undefined} />

    {#if open}
      <div class="panel" role="presentation">
        <div class="search">
          <Search size={15} />
          <input
            bind:this={searchEl}
            type="search"
            placeholder="Rechercher un pays ou un indicatif"
            aria-label="Rechercher un pays"
            autocomplete="off"
            bind:value={query}
            onkeydown={onSearchKey}
            role="combobox"
            aria-expanded="true"
            aria-controls="{id}-list"
            aria-activedescendant={filtered[active] ? `${id}-opt-${filtered[active].iso2}` : undefined}
          />
        </div>
        <ul id="{id}-list" role="listbox" aria-label="Pays" bind:this={listEl}>
          {#each filtered as c, i (c.iso2)}
            <!-- clavier : gere par le champ de recherche (pattern combobox) -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li id="{id}-opt-{c.iso2}" role="option" aria-selected={c.code === countryCode && c.iso2 === current.iso2} class:active={i === active} onmousemove={() => (active = i)} onclick={() => pick(c)}>
              <span class="flag" aria-hidden="true">{c.flag}</span>
              <span class="nm">{c.name}</span>
              <span class="dc">+{c.code}</span>
            </li>
          {:else}
            <li class="none" role="presentation">Aucun pays ne correspond.</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<svelte:window onpointerdown={onOutside} />

<style>
  /* Un seul bloc : indicatif + numero partagent la meme bordure, le meme survol et le meme halo de focus. */
  .phone-field {
    position: relative;
    display: flex;
    align-items: stretch;
    border: 1.5px solid var(--field-border);
    border-radius: 12px;
    background: var(--field-bg);
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }
  .phone-field:hover:not(:focus-within) {
    border-color: var(--field-border-hover);
  }
  .phone-field:focus-within {
    border-color: var(--green);
    box-shadow: 0 0 0 4px var(--field-ring);
  }
  .phone-field.invalid {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
  }
  .dial {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0 0.8rem;
    border: 0;
    border-right: 1.5px solid var(--field-border);
    border-radius: 11px 0 0 11px;
    background: #f7f8f5;
    font: inherit;
    font-size: 0.97rem;
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
  }
  .dial:hover {
    background: #eef1ec;
  }
  .dial :global(svg) {
    color: var(--muted);
    transition: transform 0.18s;
  }
  .open .dial :global(svg) {
    transform: rotate(180deg);
  }
  .flag {
    font-size: 1.25rem;
    line-height: 1;
  }
  .phone-field > input {
    flex: 1;
    min-width: 0;
    border: 0;
    border-radius: 0 11px 11px 0;
    box-shadow: none !important;
  }
  .panel {
    position: absolute;
    z-index: 40;
    top: calc(100% + 6px);
    left: 0;
    width: min(22rem, 100vw - 2rem);
    background: #fff;
    border: 1.5px solid var(--field-border);
    border-radius: 14px;
    box-shadow: 0 18px 44px rgba(15, 23, 32, 0.2);
    overflow: hidden;
    animation: pop 0.14s ease-out;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.8rem;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0 !important;
    box-shadow: none !important;
    background: transparent;
    padding-left: 0;
    min-height: 44px;
  }
  ul {
    max-height: 16rem;
    overflow-y: auto;
    margin: 0;
    padding: 0.3rem;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.65rem;
    border-radius: 9px;
    cursor: pointer;
    font-size: 0.93rem;
  }
  li.active {
    background: var(--green-soft);
  }
  li[aria-selected="true"] .nm {
    font-weight: 800;
  }
  .nm {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dc {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
  }
  li.none {
    justify-content: center;
    color: var(--muted);
    cursor: default;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
</style>
