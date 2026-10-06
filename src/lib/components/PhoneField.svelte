<script lang="ts">
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

  let {
    countryCode = $bindable("228"),
    phone = $bindable(""),
    label,
    id = "phone",
    required = true,
  }: {
    countryCode: string;
    phone: string;
    label: string;
    id?: string;
    required?: boolean;
  } = $props();
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="phone-field">
    <select bind:value={countryCode} aria-label="Indicatif pays">
      {#each COUNTRIES as c (c.iso2)}
        <option value={c.code}>{c.flag} {c.name} +{c.code}</option>
      {/each}
    </select>
    <input {id} type="tel" inputmode="numeric" autocomplete="tel-national" bind:value={phone} {required} />
  </div>
</div>

<style>
  .phone-field {
    display: flex;
    gap: 0.5rem;
  }

  .phone-field select {
    flex: 0 0 auto;
    width: auto;
    max-width: 9rem;
  }

  .phone-field input {
    flex: 1;
    min-width: 0;
  }
</style>
