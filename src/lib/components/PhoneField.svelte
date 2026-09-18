<script lang="ts">
  // Pays effectivement desservis par Trankyl (table `countries`,
  // country_has_service = 1) — pas une liste generique de pays du monde.
  const COUNTRIES = [
    { code: "228", flag: "🇹🇬", name: "Togo" },
    { code: "229", flag: "🇧🇯", name: "Bénin" },
  ];

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
      {#each COUNTRIES as c (c.code)}
        <option value={c.code}>{c.flag} +{c.code}</option>
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
  }

  .phone-field input {
    flex: 1;
    min-width: 0;
  }
</style>
