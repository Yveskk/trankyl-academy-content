<script lang="ts">
  import DatePicker from "$lib/components/datetime/DatePicker.svelte";
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Calendar from "@lucide/svelte/icons/calendar";
  import Check from "@lucide/svelte/icons/check";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import Info from "@lucide/svelte/icons/info";
  import Link2 from "@lucide/svelte/icons/link-2";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Minus from "@lucide/svelte/icons/minus";
  import Plus from "@lucide/svelte/icons/plus";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Tag from "@lucide/svelte/icons/tag";
  import X from "@lucide/svelte/icons/x";
  import { meClient } from "$lib/api/auth";
  import { createBooking, getBookingPayment, payBooking, quoteBooking, type BookingCreated, type BookingInvoice, type PayMode, type Price } from "$lib/api/bookings";
  import Btn from "$lib/components/Btn.svelte";
  import PayOptions from "$lib/components/PayOptions.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "$lib/utils/leaflet";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const p = $derived(data.profile);
  const o = $derived(data.options);
  const fmt = (n: number) => n.toLocaleString(en ? "en-US" : "fr-FR").replace(/ | /g, " ");

  // ------------------------------------------------------------ 1. service, formule, quantite, options
  let serviceId = $state<number | null>(untrack(() => (data.options.services.some((s) => s.id === data.serviceId) ? data.serviceId : (data.options.services[0]?.id ?? null))));
  const service = $derived(o.services.find((s) => s.id === serviceId) ?? null);
  let unitId = $state<string | null>(null);
  $effect(() => {
    // une autre formule de prix n'existe pas pour un autre service : on revient a la premiere
    const units = service?.units ?? [];
    if (!units.some((u) => u.unit_id === unitId)) unitId = units[0]?.unit_id ?? null;
  });
  const unit = $derived(service?.units.find((u) => u.unit_id === unitId) ?? null);
  let qty = $state(1);
  let chosenOptions = $state<string[]>([]);
  $effect(() => {
    void serviceId;
    chosenOptions = [];
  });
  const toggleOption = (name: string) => (chosenOptions = chosenOptions.includes(name) ? chosenOptions.filter((n) => n !== name) : [...chosenOptions, name]);

  // ------------------------------------------------------------ 2. date et heure
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = dayStr(new Date());
  const maxDay = $derived(dayStr(new Date(Date.now() + o.max_days_ahead * 86400000)));
  const TIMES = Array.from({ length: 32 }, (_, i) => `${pad(6 + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);
  const initialSlot = untrack(() => data.options.slots.find((s) => s.iso === data.slotIso) ?? null);
  let date = $state(initialSlot ? initialSlot.iso.slice(0, 10) : "");
  let time = $state(initialSlot ? initialSlot.iso.slice(11, 16) : "");
  const pickSlot = (iso: string) => {
    date = iso.slice(0, 10);
    time = iso.slice(11, 16);
  };
  const slotParts = (label: string) => label.split("|");

  // ------------------------------------------------------------ 3. lieu
  let address = $state("");
  let districtId = $state<number | null>(null);
  let locMode = $state<"none" | "map" | "link">("none");
  let link = $state("");
  let lat = $state<number | null>(null);
  let lng = $state<number | null>(null);
  let streetName = $state("");
  let streetNumber = $state("");
  let postalCode = $state("");
  const MAPS = /^https:\/\/(www\.)?(google\.[a-z.]{2,6}\/maps|maps\.google\.[a-z.]{2,6}|maps\.app\.goo\.gl|goo\.gl\/maps)/i;
  let mapEl = $state<HTMLDivElement | undefined>();

  // Carte interactive : un clic place la position (facultatif). Chargee a la demande.
  $effect(() => {
    if (locMode !== "map" || !mapEl) return;
    let map: any;
    let marker: any;
    let cancelled = false;
    const center: [number, number] = [lat ?? p.zone.lat ?? 6.1375, lng ?? p.zone.lng ?? 1.2123];
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl) return;
        map = L.map(mapEl, { attributionControl: true }).setView(center, lat != null ? 16 : 12);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        const place = (la: number, ln: number) => {
          lat = +la.toFixed(6);
          lng = +ln.toFixed(6);
          if (marker) marker.setLatLng([la, ln]);
          else marker = L.marker([la, ln]).addTo(map);
        };
        if (lat != null && lng != null) place(lat, lng);
        map.on("click", (e: any) => place(e.latlng.lat, e.latlng.lng));
        (mapEl as any).__place = (la: number, ln: number) => {
          place(la, ln);
          map.setView([la, ln], 16);
        };
      })
      .catch(() => snackbar.error(t("La carte n'a pas pu être chargée.", "The map could not be loaded.")));
    return () => {
      cancelled = true;
      map?.remove();
    };
  });
  function locate() {
    if (!navigator.geolocation) return snackbar.error(t("La géolocalisation n'est pas disponible sur cet appareil.", "Geolocation is not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (pos) => (mapEl as any)?.__place?.(pos.coords.latitude, pos.coords.longitude),
      () => snackbar.error(t("Position refusée ou indisponible.", "Position denied or unavailable.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  function clearPosition() {
    lat = lng = null;
    link = "";
    locMode = "none";
  }

  // ------------------------------------------------------------ 4. vos informations
  let name = $state("");
  let countryCode = $state("228");
  let phone = $state("");
  let info = $state("");
  let isClient = $derived(auth.role === "client");
  $effect(() => {
    if (!isClient) return;
    untrack(() => {
      meClient()
        .then((me) => {
          if (!name) name = `${me.firstname} ${me.lastname}`.trim();
          if (!phone && me.phone) {
            const digits = me.phone.replace(/\D/g, "");
            const code = ["228", "229", "225", "223", "237", "33"].find((c) => digits.startsWith(c));
            countryCode = code ?? "228";
            phone = code ? digits.slice(code.length) : digits;
          }
        })
        .catch(() => {});
    });
  });

  // ------------------------------------------------------------ 5. code promo + paiement
  let couponInput = $state("");
  let coupon = $state<string | null>(null);
  let couponBusy = $state(false);
  let payment = $state<"cash" | "online">("cash");
  // Paiement en ligne : tout, mise en relation seule ou service seul (parts calculees comme cote serveur).
  let payMode = $state<PayMode>("ALL");
  let payOptions = $derived.by(() => {
    if (!price) return [];
    const total = price.total;
    const pl = Math.min(price.linking, total);
    return ([{ mode: "ALL", amount: total }, { mode: "PL", amount: pl }, { mode: "BK", amount: total - pl }] as { mode: PayMode; amount: number }[]).filter((o) => o.amount > 0);
  });

  // ------------------------------------------------------------ prix (toujours calcule par le serveur)
  let price = $state<Price | null>(null);
  let quoting = $state(false);
  $effect(() => {
    if (serviceId === null || unitId === null) {
      price = null;
      return;
    }
    const body = { ref: String(p.vendor_id), service_id: serviceId, unit_id: unitId, qty, options: [...chosenOptions], coupon };
    const handle = setTimeout(async () => {
      quoting = true;
      try {
        price = await quoteBooking(body);
      } catch (e) {
        snackbar.error((e as Error).message);
        if (coupon) coupon = null;
      } finally {
        quoting = false;
      }
    }, 200);
    return () => clearTimeout(handle);
  });
  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || serviceId === null || unitId === null) return;
    couponBusy = true;
    try {
      price = await quoteBooking({ ref: String(p.vendor_id), service_id: serviceId, unit_id: unitId, qty, options: [...chosenOptions], coupon: code });
      coupon = price.coupon?.code ?? code;
      snackbar.success(t("Code promo appliqué.", "Promo code applied."));
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      couponBusy = false;
    }
  }
  const removeCoupon = () => {
    coupon = null;
    couponInput = "";
  };

  // ------------------------------------------------------------ validation + envoi
  let touched = $state(false);
  let sending = $state(false);
  let done = $state<BookingCreated | null>(null);

  // Paiement en ligne : lien SEMOA, confirmation (webhook cote serveur) relue toutes les 5 s.
  let invoice = $state<BookingInvoice | null>(null);
  let payError = $state("");
  let paid = $state(false);
  let remaining = $state(0); // reste a regler apres un paiement partiel (mise en relation seule ou service seul)
  let retrying = $state(false);
  $effect(() => {
    if (!done || done.payment.method !== "online") return;
    invoice = done.payment.invoice;
    payError = done.payment.invoice_error ?? "";
    const id = done.id;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      if (stop || paid || Date.now() - started > 20 * 60_000) return;
      try {
        const s = await getBookingPayment(id);
        // Une facture ouverte = un paiement en attente ; `paid` des qu'un paiement est recu (meme partiel).
        if (s.payment.paid > 0) {
          paid = true;
          remaining = s.payment.remaining;
        } else if (s.invoice && !invoice) invoice = s.invoice;
      } catch {
        /* reseau instable : on retente au prochain passage */
      }
      if (!stop && !paid) timer = setTimeout(tick, 5000);
    };
    let timer = setTimeout(tick, 5000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  });
  async function retryPay() {
    if (!done) return;
    retrying = true;
    try {
      const r = await payBooking(done.id);
      invoice = r.invoice;
      payError = "";
    } catch (err) {
      payError = (err as Error).message;
    } finally {
      retrying = false;
    }
  }
  const digits = $derived(phone.replace(/\D/g, ""));
  const errors = $derived({
    service: serviceId === null ? t("Choisissez un service.", "Choose a service.") : "",
    date: !date ? t("Choisissez une date.", "Pick a date.") : date < today || date > maxDay ? t("Date hors de la période possible.", "Date out of the allowed range.") : "",
    time: !time ? t("Choisissez une heure.", "Pick a time.") : date === today && time < `${pad(new Date().getHours())}:${pad(new Date().getMinutes() + 30 > 59 ? 59 : new Date().getMinutes() + 30)}` ? t("Choisissez un horaire dans le futur (30 min minimum).", "Pick a future time (30 min minimum).") : "",
    address: address.trim().length < 3 ? t("Indiquez l'adresse de la prestation.", "Enter the service address.") : "",
    district: o.districts.length > 0 && districtId === null ? t("Choisissez votre quartier.", "Choose your district.") : "",
    link: link.trim() && !MAPS.test(link.trim()) ? t("Collez un lien Google Maps valide.", "Paste a valid Google Maps link.") : "",
    name: name.trim().length < 2 ? t("Indiquez votre nom.", "Enter your name.") : "",
    phone: digits.length < 6 ? t("Numéro de téléphone invalide.", "Invalid phone number.") : "",
  });
  const hasErrors = $derived(Object.values(errors).some(Boolean));
  const e = (k: keyof typeof errors) => (touched ? errors[k] : "");

  let redirect = $derived(encodeURIComponent($page.url.pathname + $page.url.search));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!isClient) {
      snackbar.error(t("Connectez-vous avec un compte client pour réserver.", "Sign in with a customer account to book."));
      await goto(`/client/login?redirect=${redirect}`);
      return;
    }
    touched = true;
    if (hasErrors || serviceId === null) {
      snackbar.error(t("Vérifiez les champs indiqués.", "Please check the highlighted fields."));
      document.querySelector("[aria-invalid=true], .rv-err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    sending = true;
    try {
      done = await createBooking({
        ref: String(p.vendor_id), service_id: serviceId, unit_id: unitId, qty, options: [...chosenOptions], coupon,
        date, time, name: name.trim(), phone: `+${countryCode}${digits}`, address: address.trim(), info: info.trim() || null,
        district_id: districtId, link: link.trim() || null, latitude: lat, longitude: lng,
        street_name: streetName.trim() || null, street_number: streetNumber.trim() || null, postal_code: postalCode.trim() || null, payment, pay_mode: payment === "online" ? payMode : undefined,
      });
      snackbar.success(t("Réservation enregistrée.", "Booking saved."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      snackbar.error((err as Error).message);
    } finally {
      sending = false;
    }
  }

  const dateLabel = (d: string, hhmm: string) => (d ? `${new Date(d + "T12:00:00").toLocaleDateString(en ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long" })}${hhmm ? ` · ${hhmm}` : ""}` : "");
</script>

<Seo title={`${t("Réserver", "Book")} ${p.name}`} description={`${t("Réservez", "Book")} ${p.name}.`} noindex />

<div class="rv">
  <div class="wrap">
    {#if done}
      <section class="done" role="status">
        <span class="done-ico"><Check size={30} /></span>
        <h1>{t("Réservation enregistrée !", "Booking saved!")}</h1>
        <p class="ref">{t("Référence", "Reference")} <strong>{done.ref}</strong></p>
        <p class="lead">
          {t(`${p.short_name} a bien reçu votre demande. Vous serez contacté pour confirmer le rendez-vous.`, `${p.short_name} has received your request. You will be contacted to confirm the appointment.`)}
        </p>
        {#if done.payment.method === "online"}
          <div class="paybox" class:ok={paid}>
            {#if paid}
              <p><Check size={18} /> <strong>{t("Paiement confirmé. Merci !", "Payment confirmed. Thank you!")}</strong>{#if remaining > 0}<br />{t(`Il reste ${fmt(remaining)} FCFA à régler : vous pouvez le faire depuis « Mes réservations ».`, `${fmt(remaining)} FCFA remain to be paid: you can do it from “My bookings”.`)}{/if}</p>
            {:else if invoice}
              <p><strong>{t("Dernière étape : réglez en ligne", "Last step: pay online")}</strong><br />{t("Mobile Money ou carte, sur la page de paiement sécurisée. Cette page se met à jour dès que le paiement est reçu.", "Mobile Money or card, on the secure payment page. This page updates as soon as the payment is received.")}</p>
              <a class="btn btn-gold" href={invoice.bill_url} target="_blank" rel="noopener noreferrer">{t("Payer", "Pay")} {fmt(invoice.amount ?? done.price.total)} FCFA</a>
            {:else}
              <p><strong>{t("Le paiement en ligne n'a pas pu démarrer.", "Online payment could not start.")}</strong><br />{payError} {t("Votre réservation est bien enregistrée.", "Your booking is saved.")}</p>
              <Btn class="btn-gold" loading={retrying} onclick={retryPay}>{t("Réessayer le paiement", "Retry payment")}</Btn>
            {/if}
          </div>
        {/if}
        <ul class="recap">
          <li><span>{t("Service", "Service")}</span><strong>{service?.title}</strong></li>
          <li><span>{t("Rendez-vous", "Appointment")}</span><strong>{dateLabel(date, time)}</strong></li>
          <li><span>{t("Adresse", "Address")}</span><strong>{address}</strong></li>
          <li><span>{t("Paiement", "Payment")}</span><strong>{payment === "cash" ? t("En espèces, à la fin de la prestation", "Cash, at the end of the service") : t("En ligne", "Online")}</strong></li>
          <li class="tot"><span>{t("Total", "Total")}</span><strong>{fmt(done.price.total)} FCFA</strong></li>
        </ul>
        <div class="actions">
          <a class="btn btn-gold" href="/client/reservations">{t("Mes réservations", "My bookings")}</a>
          <a class="btn btn-outline" href="/profil/{p.slug}">{t("Voir le profil", "View profile")}</a>
          <a class="btn btn-outline" href="/recherche">{t("Autres prestataires", "Other providers")}</a>
        </div>
      </section>
    {:else}
      <header class="head">
        <span class="avatar">{p.initials}</span>
        <div>
          <h1>{t("Réserver", "Book")} {p.name}</h1>
          <p>{[p.job, p.city].filter(Boolean).join(" · ")}{#if p.stats.rating} · ★ {p.stats.rating.toLocaleString(en ? "en-US" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({p.stats.reviews_count}){/if}</p>
        </div>
      </header>

      {#if !isClient}
        <div class="login-note" role="note">
          <Info size={18} />
          <p>{t("Vous pouvez remplir la réservation dès maintenant. Pour l'envoyer, connectez-vous avec un compte client.", "You can fill in the booking now. To send it, sign in with a customer account.")}</p>
          <a class="btn btn-outline btn-sm" href="/client/login?redirect={redirect}">{t("Se connecter", "Sign in")}</a>
          <a class="btn btn-gold btn-sm" href="/client/register?redirect={redirect}">{t("Créer un compte", "Create account")}</a>
        </div>
      {/if}

      <form class="grid" onsubmit={submit} novalidate>
        <div class="main">
          <!-- ------------------------------------------------------------- 1. service -->
          <section class="card" class:rv-err={!!e("service")}>
            <h2><span class="n">1</span> {t("Quel service ?", "Which service?")}</h2>
            {#if o.services.length === 0}
              <p class="muted">{t("Ce prestataire n'a pas de service réservable en ligne : demandez-lui un devis depuis son profil.", "This provider has no service bookable online: request a quote from the profile.")}</p>
            {:else}
              <div class="svc-list" role="radiogroup" aria-label={t("Service", "Service")}>
                {#each o.services as s (s.id)}
                  <label class="svc" class:on={serviceId === s.id}>
                    <input type="radio" name="service" value={s.id} bind:group={serviceId} />
                    <span class="radio">{#if serviceId === s.id}<Check size={13} />{/if}</span>
                    <span class="svc-t"><strong>{s.title}</strong>{#if s.description}<small>{s.description}</small>{/if}</span>
                    <span class="svc-p">{t("dès", "from")} {fmt(Math.min(...s.units.map((u) => u.price)))} FCFA</span>
                  </label>
                {/each}
              </div>

              {#if service}
                {#if service.units.length > 1}
                  <div class="field">
                    <label for="unit">{t("Formule", "Option")}</label>
                    <select id="unit" bind:value={unitId}>
                      {#each service.units as u (u.unit_id)}<option value={u.unit_id}>{u.label ?? t("Formule", "Option")} — {fmt(u.price)} FCFA</option>{/each}
                    </select>
                  </div>
                {/if}
                <div class="qty-row">
                  <span class="lbl">{t("Quantité", "Quantity")}</span>
                  <div class="qty" role="group" aria-label={t("Quantité", "Quantity")}>
                    <button type="button" aria-label={t("Moins", "Less")} disabled={qty <= 1} onclick={() => (qty = Math.max(1, qty - 1))}><Minus size={16} /></button>
                    <output>{qty}</output>
                    <button type="button" aria-label={t("Plus", "More")} disabled={qty >= 20} onclick={() => (qty = Math.min(20, qty + 1))}><Plus size={16} /></button>
                  </div>
                </div>
                {#if service.options.length > 0}
                  <fieldset class="opts">
                    <legend>{t("Options", "Options")} <small>({t("facultatif", "optional")})</small></legend>
                    {#each service.options as op (op.name)}
                      <label class="opt"><input type="checkbox" checked={chosenOptions.includes(op.name)} onchange={() => toggleOption(op.name)} /> <span>{op.name}</span> <em>+ {fmt(op.price)} FCFA</em></label>
                    {/each}
                  </fieldset>
                {/if}
              {/if}
            {/if}
            {#if e("service")}<p class="field-error">{e("service")}</p>{/if}
          </section>

          <!-- ------------------------------------------------------------- 2. date et heure -->
          <section class="card">
            <h2><span class="n">2</span> {t("Quand ?", "When?")}</h2>
            {#if o.slots.length > 0}
              <div class="slots" role="group" aria-label={t("Disponibilités proposées", "Suggested availability")}>
                {#each o.slots as s}
                  {@const [d, h] = slotParts(s.label)}
                  <button type="button" class="slot" class:on={date === s.iso.slice(0, 10) && time === s.iso.slice(11, 16)} onclick={() => pickSlot(s.iso)}><span>{d}</span><span>{h}</span></button>
                {/each}
              </div>
              <p class="hint">{t("Ou choisissez librement :", "Or choose freely:")}</p>
            {/if}
            <div class="two">
              <div class="field">
                <label for="date">{t("Date", "Date")}</label>
                <DatePicker id="date" bind:value={date} min={today} max={maxDay} invalid={!!e("date")} />
                {#if e("date")}<p class="field-error">{e("date")}</p>{/if}
              </div>
              <div class="field">
                <label for="time">{t("Heure", "Time")}</label>
                <select id="time" bind:value={time} aria-invalid={e("time") ? true : undefined}>
                  <option value="" disabled>{t("Choisir", "Choose")}</option>
                  {#each TIMES as h}<option value={h}>{h}</option>{/each}
                </select>
                {#if e("time")}<p class="field-error">{e("time")}</p>{/if}
              </div>
            </div>
          </section>

          <!-- ------------------------------------------------------------- 3. lieu -->
          <section class="card">
            <h2><span class="n">3</span> {t("Où ?", "Where?")}</h2>
            <div class="field">
              <label for="address">{t("Adresse de la prestation", "Service address")}</label>
              <input id="address" bind:value={address} maxlength="300" autocomplete="street-address" placeholder={t("Quartier, rue, repère (ex. près du marché)", "District, street, landmark (e.g. near the market)")} aria-invalid={e("address") ? true : undefined} />
              {#if e("address")}<p class="field-error">{e("address")}</p>{/if}
            </div>
            {#if o.districts.length > 0}
              <div class="field">
                <label for="district">{t("Quartier", "District")}</label>
                <select id="district" bind:value={districtId} aria-invalid={e("district") ? true : undefined}>
                  <option value={null} disabled selected>{t("Choisir votre quartier", "Choose your district")}</option>
                  {#each o.districts as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
                </select>
                {#if e("district")}<p class="field-error">{e("district")}</p>{/if}
              </div>
            {/if}

            <div class="loc">
              <span class="lbl">{t("Préciser la position", "Pin the location")} <small>({t("facultatif, aide le prestataire à vous trouver", "optional, helps the provider find you")})</small></span>
              <div class="tabs" role="tablist">
                <button type="button" role="tab" aria-selected={locMode === "map"} class:on={locMode === "map"} onclick={() => (locMode = locMode === "map" ? "none" : "map")}><MapPin size={15} /> {t("Sur la carte", "On the map")}</button>
                <button type="button" role="tab" aria-selected={locMode === "link"} class:on={locMode === "link"} onclick={() => (locMode = locMode === "link" ? "none" : "link")}><Link2 size={15} /> {t("Lien Google Maps", "Google Maps link")}</button>
              </div>
              {#if locMode === "map"}
                <div class="map-wrap">
                  <div class="map" bind:this={mapEl} role="application" aria-label={t("Carte : cliquez pour placer votre position", "Map: click to set your position")}></div>
                  <button type="button" class="locate" onclick={locate}><Crosshair size={15} /> {t("Ma position", "My location")}</button>
                </div>
                <p class="hint">{lat != null ? `${t("Position choisie", "Chosen position")} : ${lat}, ${lng}` : t("Cliquez sur la carte pour placer le repère.", "Click on the map to drop the pin.")}</p>
              {:else if locMode === "link"}
                <div class="field">
                  <input id="link" type="url" bind:value={link} placeholder="https://maps.app.goo.gl/…" aria-label={t("Lien Google Maps", "Google Maps link")} aria-invalid={e("link") ? true : undefined} />
                  {#if e("link")}<p class="field-error">{e("link")}</p>{:else}<p class="hint">{t("Dans Google Maps : Partager → Copier le lien.", "In Google Maps: Share → Copy link.")}</p>{/if}
                </div>
              {/if}
              {#if lat != null || link}<button type="button" class="linkish" onclick={clearPosition}><X size={13} /> {t("Retirer la position", "Remove location")}</button>{/if}
            </div>

            <details class="more">
              <summary>{t("Détails de l'adresse (rue, numéro, code postal)", "Address details (street, number, postal code)")}</summary>
              <div class="three">
                <div class="field"><label for="street">{t("Rue", "Street")}</label><input id="street" bind:value={streetName} maxlength="120" /></div>
                <div class="field"><label for="number">{t("Numéro", "Number")}</label><input id="number" bind:value={streetNumber} maxlength="30" /></div>
                <div class="field"><label for="postal">{t("Code postal", "Postal code")}</label><input id="postal" bind:value={postalCode} maxlength="10" /></div>
              </div>
            </details>
          </section>

          <!-- ------------------------------------------------------------- 4. vos informations -->
          <section class="card">
            <h2><span class="n">4</span> {t("Vos informations", "Your details")}</h2>
            <div class="field">
              <label for="name">{t("Nom complet", "Full name")}</label>
              <input id="name" bind:value={name} maxlength="120" autocomplete="name" aria-invalid={e("name") ? true : undefined} />
              {#if e("name")}<p class="field-error">{e("name")}</p>{/if}
            </div>
            <div class="field">
              <PhoneField bind:countryCode bind:phone label={t("Téléphone (le prestataire vous appellera)", "Phone (the provider will call you)")} invalid={!!e("phone")} />
              {#if e("phone")}<p class="field-error">{e("phone")}</p>{/if}
            </div>
            <div class="field">
              <label for="info">{t("Informations complémentaires", "Additional information")} <small>({t("facultatif", "optional")})</small></label>
              <textarea id="info" bind:value={info} maxlength="1000" rows="3" placeholder={t("Décrivez votre besoin, l'accès, l'étage…", "Describe your need, access, floor…")}></textarea>
            </div>
          </section>

          <!-- ------------------------------------------------------------- 5. code promo + paiement -->
          <section class="card">
            <h2><span class="n">5</span> {t("Code promo et paiement", "Promo code and payment")}</h2>
            <div class="promo">
              {#if coupon}
                <div class="promo-on"><Tag size={16} /> <strong>{coupon}</strong> {t("appliqué", "applied")} <button type="button" class="linkish" onclick={removeCoupon}><X size={13} /> {t("Retirer", "Remove")}</button></div>
              {:else}
                <div class="promo-row">
                  <input bind:value={couponInput} placeholder={t("Code promo", "Promo code")} aria-label={t("Code promo", "Promo code")} maxlength="25" autocapitalize="characters" onkeydown={(ev) => ev.key === "Enter" && (ev.preventDefault(), applyCoupon())} />
                  <Btn class="btn-outline" loading={couponBusy} disabled={!couponInput.trim()} onclick={applyCoupon}>{t("Appliquer", "Apply")}</Btn>
                </div>
              {/if}
            </div>
            <fieldset class="pay" aria-label={t("Mode de paiement", "Payment method")}>
              <label class="pay-opt" class:on={payment === "cash"}>
                <input type="radio" name="pay" value="cash" bind:group={payment} />
                <span class="radio">{#if payment === "cash"}<Check size={13} />{/if}</span>
                <span><strong>{t("En espèces", "Cash")}</strong><small>{t("Vous réglez le prestataire à la fin de la prestation.", "You pay the provider at the end of the service.")}</small></span>
              </label>
              <label class="pay-opt" class:on={payment === "online"} class:off={!o.payment.online}>
                <input type="radio" name="pay" value="online" bind:group={payment} disabled={!o.payment.online} />
                <span class="radio">{#if payment === "online"}<Check size={13} />{/if}</span>
                <span><strong>{t("En ligne", "Online")}</strong><small>{o.payment.online ? t("Mobile Money ou carte, paiement sécurisé.", "Mobile Money or card, secure payment.") : t("Bientôt disponible.", "Coming soon.")}</small></span>
              </label>
            </fieldset>
            {#if payment === "online" && o.payment.online}
              <div class="paymode">
                <p class="paymode-t">{t("Que souhaitez-vous payer maintenant ?", "What would you like to pay now?")}</p>
                {#if payOptions.length}<PayOptions options={payOptions} bind:value={payMode} />{:else}<p class="muted">{t("Calcul du prix…", "Calculating price…")}</p>{/if}
              </div>
            {/if}
          </section>
        </div>

        <!-- --------------------------------------------------------------- récapitulatif -->
        <aside class="side">
          <div class="sum">
            <h3>{t("Récapitulatif", "Summary")}</h3>
            {#if service}
              <p class="s-svc">{service.title}{#if unit?.label} <small>({unit.label})</small>{/if}</p>
            {/if}
            {#if date}<p class="s-when"><Calendar size={14} /> {dateLabel(date, time)}</p>{/if}
            {#if address.trim()}<p class="s-when"><MapPin size={14} /> {address}</p>{/if}
            <dl class="lines" aria-busy={quoting}>
              <div><dt>{t("Service", "Service")}{qty > 1 ? ` × ${qty}` : ""}</dt><dd>{price ? fmt(price.service) : "—"} FCFA</dd></div>
              {#if price && price.options > 0}<div><dt>{t("Options", "Options")}</dt><dd>{fmt(price.options)} FCFA</dd></div>{/if}
              <div>
                <dt title={t("Frais de mise en relation Trankyl : ils couvrent la sécurité et le suivi de votre réservation.", "Trankyl connection fee: it covers the security and follow-up of your booking.")}>{t("Mise en relation", "Connection fee")} <Info size={12} /></dt>
                <dd>{price ? fmt(price.linking) : fmt(o.linking_amount)} FCFA</dd>
              </div>
              {#if price && price.discount > 0}<div class="disc"><dt>{t("Réduction", "Discount")}</dt><dd>− {fmt(price.discount)} FCFA</dd></div>{/if}
              <div class="total"><dt>{t("Total", "Total")}</dt><dd>{price ? fmt(price.total) : "—"} FCFA</dd></div>
            </dl>
            <Btn type="submit" class="btn-gold" loading={sending} disabled={o.services.length === 0 || quoting}>{isClient ? (payment === "online" ? t("Confirmer et payer", "Confirm and pay") : t("Confirmer la réservation", "Confirm booking")) : t("Se connecter pour réserver", "Sign in to book")}</Btn>
            <p class="safe"><ShieldCheck size={14} /> {payment === "online" ? t("Après confirmation, vous réglez en ligne sur une page sécurisée (Mobile Money ou carte).", "After confirming, you pay online on a secure page (Mobile Money or card).") : t("Aucun paiement n'est prélevé maintenant. Vous pouvez annuler tant que le prestataire n'a pas confirmé.", "Nothing is charged now. You can cancel until the provider confirms.")}</p>
          </div>
        </aside>
      </form>
    {/if}
  </div>
</div>

<style>
  .rv {
    background: #fbfaf6;
    min-height: 70vh;
    padding: 1.2rem 0 4rem;
  }
  .wrap {
    width: min(1120px, 100% - 2rem);
    margin: 0 auto;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0 1.2rem;
  }
  .head h1 {
    margin: 0;
    font-size: clamp(1.5rem, 3vw, 2rem);
  }
  .head p {
    margin: 0.15rem 0 0;
    color: var(--muted);
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--green-deep);
    color: #fff;
    font-weight: 800;
  }
  .login-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.7rem;
    padding: 0.8rem 1rem;
    margin-bottom: 1rem;
    border-radius: 14px;
    background: #fff4d1;
    color: #6b4a00;
  }
  .login-note p {
    flex: 1 1 18rem;
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 21rem;
    gap: 1.4rem;
    align-items: start;
    max-width: none;
  }
  .main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .card {
    background: #fff;
    border: 1px solid #ece9df;
    border-radius: 20px;
    padding: 1.3rem 1.4rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 6px 20px rgba(15, 23, 32, 0.04);
  }
  .card.rv-err {
    border-color: var(--danger);
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
    font-size: 1.1rem;
  }
  .n {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--gold, #ffc72c);
    color: var(--green-deep);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .muted,
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .lbl,
  legend {
    font-size: 0.85rem;
    font-weight: 700;
    padding: 0;
  }
  small {
    font-weight: 500;
    color: var(--muted);
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }
  .three {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.8rem;
    margin-top: 0.8rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }
  .field input,
  .field select,
  .field textarea {
    width: 100%;
  }
  .field-error {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--danger);
  }
  /* services */
  .svc-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .svc,
  .pay-opt {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid var(--field-border);
    border-radius: 14px;
    cursor: pointer;
    background: #fff;
    transition: border-color 0.16s, background 0.16s, box-shadow 0.16s;
  }
  .svc:hover,
  .pay-opt:hover:not(.off) {
    border-color: var(--field-border-hover);
  }
  .svc.on,
  .pay-opt.on {
    border-color: var(--green);
    background: var(--green-soft);
    box-shadow: 0 0 0 4px var(--field-ring);
  }
  .svc input,
  .pay-opt input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .pay-opt.off {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .radio {
    flex: none;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin-top: 0.1rem;
    border-radius: 50%;
    border: 2px solid #c9d0c9;
    color: #fff;
    background: #fff;
  }
  .on .radio {
    border-color: var(--green);
    background: var(--green);
  }
  .svc-t {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .svc-t small {
    margin-top: 0.15rem;
  }
  .svc-p {
    font-weight: 800;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .qty-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .qty {
    display: inline-flex;
    align-items: center;
    border: 1.5px solid var(--field-border);
    border-radius: 12px;
    overflow: hidden;
  }
  .qty button {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 0;
    background: #f7f8f5;
    cursor: pointer;
  }
  .qty button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .qty output {
    min-width: 46px;
    text-align: center;
    font-weight: 800;
  }
  .opts {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .opt span {
    flex: 1;
  }
  .opt em {
    font-style: normal;
    color: var(--muted);
    font-weight: 700;
  }
  /* creneaux */
  .slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
    gap: 0.5rem;
  }
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.5rem 0.4rem;
    border: 1.5px solid var(--field-border);
    border-radius: 12px;
    background: #fff;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .slot:hover {
    border-color: var(--field-border-hover);
  }
  .slot.on {
    background: var(--green-deep);
    border-color: var(--green-deep);
    color: #fff;
  }
  /* position */
  .loc {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    border: 1.5px solid var(--field-border);
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
  }
  .tabs button.on {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .map-wrap {
    position: relative;
  }
  .map {
    height: 260px;
    border-radius: 14px;
    border: 1.5px solid var(--field-border);
    overflow: hidden;
    z-index: 0;
  }
  .locate {
    position: absolute;
    z-index: 400;
    right: 0.6rem;
    top: 0.6rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border: 0;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
  .linkish {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.8rem;
    color: var(--danger);
    text-decoration: underline;
    cursor: pointer;
  }
  .more summary {
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ink-soft);
  }
  /* promo / paiement */
  .promo-row {
    display: flex;
    gap: 0.6rem;
  }
  .promo-row input {
    flex: 1;
    min-width: 0;
    text-transform: uppercase;
  }
  .promo-on {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    border-radius: 12px;
    background: var(--green-soft);
    color: var(--green-deep);
    font-size: 0.9rem;
  }
  .promo-on .linkish {
    margin-left: auto;
  }
  .pay {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .pay-opt span:last-child {
    display: flex;
    flex-direction: column;
  }
  /* recapitulatif */
  .side {
    position: sticky;
    top: 5.5rem;
  }
  .sum {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: #fff;
    border: 2px solid var(--ink, #14211a);
    border-radius: 20px;
    padding: 1.2rem 1.2rem 1.3rem;
  }
  .sum h3 {
    margin: 0;
    font-size: 1.05rem;
  }
  .s-svc {
    margin: 0;
    font-weight: 800;
  }
  .s-when {
    display: flex;
    gap: 0.4rem;
    align-items: flex-start;
    margin: 0;
    font-size: 0.84rem;
    color: var(--ink-soft);
  }
  .s-when :global(svg) {
    flex: none;
    margin-top: 0.15rem;
  }
  .lines {
    margin: 0.3rem 0;
    padding: 0.6rem 0;
    border-top: 1px dashed #d9dcd2;
    border-bottom: 1px dashed #d9dcd2;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition: opacity 0.15s;
  }
  .lines[aria-busy="true"] {
    opacity: 0.55;
  }
  .lines div {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    font-size: 0.88rem;
  }
  .lines dt {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--ink-soft);
  }
  .lines dd {
    margin: 0;
    font-weight: 700;
    white-space: nowrap;
  }
  .lines .disc dd {
    color: var(--green-deep);
  }
  .lines .total {
    padding-top: 0.4rem;
    border-top: 1px solid #ece9df;
    font-size: 1.05rem;
  }
  .lines .total dt,
  .lines .total dd {
    color: var(--ink);
    font-weight: 800;
  }
  .safe {
    display: flex;
    gap: 0.4rem;
    align-items: flex-start;
    margin: 0.2rem 0 0;
    font-size: 0.74rem;
    color: var(--muted);
  }
  .safe :global(svg) {
    flex: none;
    margin-top: 0.1rem;
  }
  .paymode {
    margin-top: 0.9rem;
  }
  .paymode-t {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    font-weight: 800;
  }
  .paybox {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    margin: 1.2rem auto;
    padding: 1.1rem 1.3rem;
    max-width: 34rem;
    border-radius: 16px;
    background: #fff8e0;
    border: 1px solid #f1d56a;
    text-align: center;
  }
  .paybox p {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.5;
  }
  .paybox.ok {
    background: #e6f7e8;
    border-color: #b6e2bd;
  }
  /* confirmation */
  .done {
    max-width: 38rem;
    margin: 2rem auto 0;
    padding: 2rem 1.6rem;
    background: #fff;
    border: 1px solid #ece9df;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 14px 40px rgba(15, 23, 32, 0.08);
    animation: pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
  }
  .done-ico {
    display: inline-grid;
    place-items: center;
    width: 66px;
    height: 66px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
  .done h1 {
    margin: 0.8rem 0 0.3rem;
  }
  .ref {
    margin: 0;
    font-size: 1.05rem;
  }
  .ref strong {
    letter-spacing: 0.08em;
    background: var(--gold-soft, #fff4d1);
    padding: 0.15rem 0.6rem;
    border-radius: 8px;
  }
  .lead {
    color: var(--ink-soft);
    margin: 0.7rem 0 1.2rem;
  }
  .recap {
    list-style: none;
    margin: 0 0 1.4rem;
    padding: 0;
    text-align: left;
    border: 1px solid #ece9df;
    border-radius: 14px;
  }
  .recap li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.65rem 0.9rem;
    border-bottom: 1px solid #f1efe7;
    font-size: 0.88rem;
  }
  .recap li:last-child {
    border-bottom: 0;
  }
  .recap span {
    color: var(--muted);
  }
  .recap strong {
    text-align: right;
  }
  .recap .tot strong {
    font-size: 1.05rem;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.97);
    }
  }
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .side {
      position: static;
      order: -1;
    }
    .two,
    .three {
      grid-template-columns: 1fr;
    }
  }
</style>
