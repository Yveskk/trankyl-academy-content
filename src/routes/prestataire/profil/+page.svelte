<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Camera from "@lucide/svelte/icons/camera";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { geocodeLink, geocodeReverse, getProviderProfile, getSpaceOptions, saveProviderProfile, getOnboarding, type Place, type ProviderProfile, type SpaceOptions } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import DatePicker from "$lib/components/datetime/DatePicker.svelte";
  import PositionMap from "$lib/components/provider/PositionMap.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let p = $state<ProviderProfile | null>(null);
  let opts = $state<SpaceOptions>({ countries: [], currencies: [], districts: [] });
  let errors = $state<Record<string, string>>({});
  let saving = $state(false);
  let locating = $state(false);
  let imageFile = $state<File | null>(null);
  let preview = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | undefined>();

  const initials = $derived(`${p?.fname?.[0] ?? ""}${p?.family_name?.[0] ?? ""}`.toUpperCase() || "?");
  const stepLabel = $derived(providerSpace.unlocked ? "MON PROFIL" : "ÉTAPE 2 SUR 3");

  onMount(async () => {
    try {
      const [prof, o] = await Promise.all([getProviderProfile(), getSpaceOptions(), providerSpace.load()]);
      p = prof;
      opts = o;
      if (prof.latitude === null) locate(true); // première visite : on demande la position tout de suite et on la place sur la carte
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  });

  function pickImage(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return void snackbar.error("Photo de profil : JPG, PNG ou WebP.");
    if (f.size > 5 * 1024 * 1024) return void snackbar.error("Photo trop volumineuse (5 Mo maximum).");
    imageFile = f;
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(f);
  }

  let mapLink = $state("");
  let denied = $state(false);
  let resolving = $state(false);

  // La position (GPS ou lien Google Maps) remplit le pays, la ville, la rue et le code postal : on ne les tape pas.
  function applyPlace(pl: Place) {
    if (!p) return;
    p.latitude = pl.latitude;
    p.longitude = pl.longitude;
    p.geolocation = pl.geolocation;
    if (pl.country_id) p.vendor_address_country = String(pl.country_id);
    if (pl.city) p.vendor_address_city = pl.city;
    if (pl.address) p.address = pl.address;
    errors = { ...errors, vendor_address_country: "", vendor_address_city: "", address: "" };
    if (pl.city) snackbar.success(`Position enregistrée : ${pl.city}${pl.country_code ? ` (${pl.country_code})` : ""}.`);
    else snackbar.error(`Position enregistrée${pl.area ? ` (${pl.area})` : ""}, mais la ville n'a pas pu être déterminée : indiquez-la dans le champ « Ville ».`);
  }

  function locate(auto = false) {
    if (!navigator.geolocation) return void (auto || snackbar.error("La géolocalisation n'est pas disponible sur cet appareil."));
    locating = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          applyPlace(await geocodeReverse(pos.coords.latitude, pos.coords.longitude));
        } catch (e) {
          if (p) {
            p.latitude = Number(pos.coords.latitude.toFixed(7));
            p.longitude = Number(pos.coords.longitude.toFixed(7));
            p.geolocation = `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
          }
          snackbar.error(`${(e as Error).message} Position GPS conservée : complétez la ville.`);
        } finally {
          locating = false;
        }
      },
      () => {
        locating = false;
        denied = true;
        // Demande automatique refusée : on reste discret (le bouton permet de réessayer) ; demande manuelle : message clair.
        if (!auto) snackbar.error("Position refusée ou indisponible : autorisez la localisation dans votre navigateur, cliquez sur la carte ou collez un lien Google Maps.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onPinMoved(lat: number, lng: number) {
    if (p) {
      p.latitude = lat;
      p.longitude = lng;
      p.geolocation = `https://www.google.com/maps?q=${lat},${lng}`;
    }
    try {
      applyPlace(await geocodeReverse(lat, lng));
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function readLink() {
    if (!mapLink.trim()) return;
    resolving = true;
    try {
      applyPlace(await geocodeLink(mapLink.trim()));
      mapLink = "";
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      resolving = false;
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!p) return;
    errors = {};
    const need: Record<string, string> = {};
    if (!p.fname.trim()) need.fname = "Le prénom est obligatoire";
    if (!p.family_name.trim()) need.family_name = "Le nom de famille est obligatoire";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(p.email.trim())) need.email = "Un email valide est obligatoire";
    if (!p.sex) need.sex = "Le sexe est obligatoire";
    if (!p.dob) need.dob = "La date de naissance est obligatoire";
    if (!p.vendor_address_country) need.vendor_address_country = "Le pays est obligatoire";
    if (!p.vendor_address_city.trim()) need.vendor_address_city = "La ville est obligatoire";
    if (p.latitude === null && !p.address.trim()) need.address = "L'adresse est obligatoire (ou utilisez votre position)";
    if (opts.currencies.length && !p.vendor_currency) need.vendor_currency = "La devise est obligatoire";
    if (Object.keys(need).length) {
      errors = need;
      snackbar.error("Veuillez corriger les champs signalés.");
      return;
    }
    saving = true;
    try {
      const fd = new FormData();
      const set = (k: string, v: string | number | null | undefined) => fd.append(k, v === null || v === undefined ? "" : String(v));
      set("fname", p.fname.trim());
      set("family_name", p.family_name.trim());
      set("email", p.email.trim());
      set("sex", p.sex);
      set("dob", p.dob);
      set("vendor_address_country", p.vendor_address_country);
      set("vendor_address_city", p.vendor_address_city.trim());
      set("address", p.address.trim());
      set("latitude", p.latitude);
      set("longitude", p.longitude);
      set("geolocation", p.geolocation);
      set("bio", p.bio);
      set("if_company", p.if_company ? "1" : "0");
      set("company_name", p.company_name);
      set("vendor_currency", p.vendor_currency);
      if (imageFile) fd.append("image", imageFile);
      const saved = await saveProviderProfile(fd);
      p = saved;
      imageFile = null;
      if (preview) URL.revokeObjectURL(preview);
      preview = null;
      if (p.image) auth.setProfile({ firstname: p.fname, lastname: p.family_name, image: p.image });
      const st = await getOnboarding();
      providerSpace.set(st);
      snackbar.success("Profil enregistré.");
      if (!st.dashboard_unlocked && st.next_step === "enrollment") await goto("/prestataire/enrolement");
    } catch (e) {
      const err = e as { data?: { errors?: Record<string, string> }; message: string };
      if (err.data?.errors) errors = err.data.errors;
      snackbar.error(err.message);
    } finally {
      saving = false;
    }
  }
</script>

<div class="pf">
  <p class="ey">{stepLabel}</p>
  <h1>Complétons votre profil</h1>
  <p class="lead">Ces informations apparaissent sur votre fiche et rassurent les clients. Les mêmes que sur Trankyl.</p>

  {#if !p}
    <p class="muted">Chargement…</p>
  {:else}
    <form onsubmit={save} novalidate>
      <div class="cols">
      <div class="col">
      <div class="photo">
        <span class="av">{#if preview ?? p.image}<img src={preview ?? p.image} alt="Aperçu" />{:else}{initials}{/if}</span>
        <div>
          <input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onchange={pickImage} />
          <button type="button" class="soft" onclick={() => fileInput?.click()}><Camera size={15} /> {p.image || preview ? "Changer la photo" : "Ajouter une photo"}</button>
          <p class="muted">JPG, PNG ou WebP · 5 Mo maximum.</p>
          {#if errors.image}<p class="field-error">{errors.image}</p>{/if}
        </div>
      </div>

      <div class="g2">
        <div class="field"><label for="fname">Prénom(s) *</label><input id="fname" bind:value={p.fname} maxlength="100" autocomplete="given-name" aria-invalid={errors.fname ? true : undefined} />{#if errors.fname}<p class="field-error">{errors.fname}</p>{/if}</div>
        <div class="field"><label for="family">Nom de famille *</label><input id="family" bind:value={p.family_name} maxlength="100" autocomplete="family-name" aria-invalid={errors.family_name ? true : undefined} />{#if errors.family_name}<p class="field-error">{errors.family_name}</p>{/if}</div>
      </div>
      <div class="g2">
        <div class="field"><label for="email">Email *</label><input id="email" type="email" bind:value={p.email} maxlength="190" autocomplete="email" autocapitalize="none" aria-invalid={errors.email ? true : undefined} />{#if errors.email}<p class="field-error">{errors.email}</p>{/if}</div>
        <div class="field"><label for="phone">Téléphone</label><input id="phone" value={p.phone} readonly disabled /><p class="hint">Votre numéro de connexion ne se modifie pas ici.</p></div>
      </div>
      <div class="g2">
        <div class="field">
          <label for="sex">Sexe *</label>
          <select id="sex" bind:value={p.sex} aria-invalid={errors.sex ? true : undefined}><option value="">Sélectionnez votre sexe</option><option value="Male">Homme</option><option value="Female">Femme</option></select>
          {#if errors.sex}<p class="field-error">{errors.sex}</p>{/if}
        </div>
        <div class="field"><label for="dob">Date de naissance *</label><DatePicker id="dob" bind:value={p.dob} max={new Date().toISOString().slice(0, 10)} placeholder="Choisissez votre date de naissance" invalid={!!errors.dob} />{#if errors.dob}<p class="field-error">{errors.dob}</p>{/if}</div>
      </div>
      {#if opts.currencies.length}
        <div class="field">
          <label for="cur">Devise *</label>
          <select id="cur" bind:value={p.vendor_currency} aria-invalid={errors.vendor_currency ? true : undefined}><option value="">Choisissez la devise de vos tarifs</option>{#each opts.currencies as c (c.id)}<option value={String(c.id)}>{c.label}</option>{/each}</select>
          {#if errors.vendor_currency}<p class="field-error">{errors.vendor_currency}</p>{/if}
        </div>
      {/if}

      <div class="field">
        <label for="bio">Description</label>
        <textarea id="bio" rows="4" maxlength="500" bind:value={p.bio} placeholder="Présentez votre activité en 500 caractères maximum"></textarea>
        <p class="hint">{p.bio.length}/500 caractères</p>
        {#if errors.bio}<p class="field-error">{errors.bio}</p>{/if}
      </div>
      <label class="chk"><input type="checkbox" bind:checked={p.if_company} /> Je suis une entreprise</label>
      {#if p.if_company}
        <div class="field"><label for="co">Nom de l'entreprise</label><input id="co" bind:value={p.company_name} maxlength="190" /></div>
      {/if}

      </div>
      <div class="col">
      <h3>Où travaillez-vous ?</h3>
      <div class="g2">
        <div class="field">
          <label for="country">Pays *</label>
          <select id="country" bind:value={p.vendor_address_country} aria-invalid={errors.vendor_address_country ? true : undefined}><option value="">Sélectionnez un pays</option>{#each opts.countries as c (c.id)}<option value={String(c.id)}>{c.name}</option>{/each}</select>
          {#if errors.vendor_address_country}<p class="field-error">{errors.vendor_address_country}</p>{/if}
        </div>
        <div class="field"><label for="city">Ville *</label><input id="city" bind:value={p.vendor_address_city} maxlength="120" autocomplete="address-level2" aria-invalid={errors.vendor_address_city ? true : undefined} />{#if errors.vendor_address_city}<p class="field-error">{errors.vendor_address_city}</p>{/if}</div>
      </div>
      <div class="field">
        <label for="address">Adresse {p.latitude === null ? "*" : ""}</label>
        <input id="address" bind:value={p.address} maxlength="300" autocomplete="street-address" placeholder="Rue, quartier, repère…" aria-invalid={errors.address ? true : undefined} />
        {#if errors.address}<p class="field-error">{errors.address}</p>{/if}
      </div>
      <div class="loc">
        <Btn class="btn-outline btn-sm" loading={locating} onclick={() => locate()}><MapPin size={15} /> Utiliser ma position</Btn>
        <span class="muted">{p.latitude !== null ? "Position enregistrée. Déplacez le repère sur la carte pour l'ajuster." : locating ? "Recherche de votre position… autorisez la localisation dans votre navigateur." : denied ? "Localisation non autorisée : cliquez sur la carte, collez un lien Google Maps ou réessayez." : "Autorisez la localisation, collez un lien Google Maps ou cliquez sur la carte."}</span>
      </div>
      <PositionMap lat={p.latitude} lng={p.longitude} onmove={onPinMoved} />
      {#if p.latitude === null}
      <div class="field">
        <label for="maplink">Ou collez un lien Google Maps</label>
        <div class="linkrow">
          <input id="maplink" type="url" bind:value={mapLink} placeholder="https://maps.app.goo.gl/…" onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); readLink(); } }} />
          <Btn class="btn-outline btn-sm" loading={resolving} disabled={!mapLink.trim()} onclick={readLink}>Lire le lien</Btn>
        </div>
      </div>
      {/if}

      </div>
      </div>
      <div class="foot"><Btn type="submit" class="btn-primary" loading={saving}>{providerSpace.unlocked ? "Enregistrer" : "Enregistrer et continuer"}</Btn></div>
    </form>
  {/if}
</div>

<style>
  .pf { width: 100%; container-type: inline-size; }
  .g2 > :global(*), .cols :global(.field) { min-width: 0; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; align-items: start; }
  .col { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .col h3 { margin-top: 0; }
  /* Deux colonnes seulement si la zone est vraiment large (pas dans la carte d'inscription, plus etroite). */
  @container (max-width: 1100px) { .cols { grid-template-columns: minmax(0, 1fr); gap: 1rem; } }
  .ey { margin: 0 0 0.4rem; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: #6b7280; }
  h1 { margin: 0 0 0.5rem; font-size: clamp(1.7rem, 3vw, 2.2rem); color: #1d2230; }
  .lead { margin: 0 0 1.4rem; color: #6b7280; max-width: 36rem; }
  form { display: flex; flex-direction: column; gap: 1rem; max-width: none; }
  h3 { margin: 0.6rem 0 0; font-size: 1rem; }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .muted { margin: 0; color: #6b7280; font-size: 0.8rem; }
  .photo { display: flex; align-items: center; gap: 1.1rem; }
  .av { width: 5.2rem; height: 5.2rem; border-radius: 50%; background: #2b303a; color: #ffc72c; display: grid; place-items: center; font-weight: 800; font-size: 1.5rem; overflow: hidden; flex: none; }
  .av img { width: 100%; height: 100%; object-fit: cover; }
  .soft { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.9rem; border-radius: 10px; border: 1.5px solid #1d2230; background: #fff; font: inherit; font-weight: 800; font-size: 0.85rem; cursor: pointer; margin-bottom: 0.3rem; }
  .linkrow { display: flex; gap: 0.6rem; }
  .linkrow input { flex: 1; min-width: 0; }
  .loc { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .chk { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
  .foot { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
  @media (max-width: 640px) { .g2 { grid-template-columns: 1fr; } }
</style>
