<script lang="ts">
  import { goto } from "$app/navigation";
  import Btn from "$lib/components/Btn.svelte";
  import DatePicker from "$lib/components/datetime/DatePicker.svelte";
  import TimePicker from "$lib/components/datetime/TimePicker.svelte";
  import { adminCreateBooking, getBookingOptions, quoteBooking, type BookingOptions, type Price } from "$lib/api/bookings";
  import { resList, type ResRow } from "$lib/api/adminResources";
  import { adminListProviders, type ProviderListItem } from "$lib/api/providersAdmin";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Search from "@lucide/svelte/icons/search";
  import Check from "@lucide/svelte/icons/check";

  /** Reservation saisie par l'administration pour un client : client -> prestataire -> service -> rendez-vous -> adresse, prix calcule par le serveur. */
  const fmt = (v: number) => v.toLocaleString("fr-FR");
  const today = new Date().toISOString().slice(0, 10);

  // 1. Client
  let clientQ = $state("");
  let clients = $state<ResRow[]>([]);
  let client = $state<ResRow | null>(null);
  let clientBusy = $state(false);
  let ctimer: ReturnType<typeof setTimeout>;
  function searchClients() {
    clearTimeout(ctimer);
    ctimer = setTimeout(async () => {
      if (clientQ.trim().length < 2) {
        clients = [];
        return;
      }
      clientBusy = true;
      try {
        clients = (await resList("clients", { q: clientQ.trim(), page_size: 8, filters: { active: "1" } })).items;
      } catch (e) {
        snackbar.error((e as Error).message);
      } finally {
        clientBusy = false;
      }
    }, 300);
  }
  function pickClient(c: ResRow) {
    client = c;
    clients = [];
    clientQ = "";
    name = [c.client_name, c.client_family_name].filter(Boolean).join(" ");
    const cc = String(c.client_country_code ?? "").replace(/\D/g, "");
    const ph = String(c.client_phone ?? "").replace(/\s/g, "");
    phone = ph.startsWith("+") ? ph : cc ? `+${cc}${ph.replace(/^0+/, "")}` : ph;
    address = c.client_address ?? "";
  }

  // 2. Prestataire
  let vendorQ = $state("");
  let vendors = $state<ProviderListItem[]>([]);
  let vendor = $state<ProviderListItem | null>(null);
  let opts = $state<BookingOptions | null>(null);
  let vtimer: ReturnType<typeof setTimeout>;
  function searchVendors() {
    clearTimeout(vtimer);
    vtimer = setTimeout(async () => {
      if (vendorQ.trim().length < 2) {
        vendors = [];
        return;
      }
      try {
        vendors = (await adminListProviders(vendorQ.trim(), true)).slice(0, 8);
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    }, 300);
  }
  async function pickVendor(v: ProviderListItem) {
    vendor = v;
    vendors = [];
    vendorQ = "";
    opts = null;
    serviceId = null;
    try {
      opts = await getBookingOptions(String(v.vendor_id));
      if (opts.services.length === 1) selectService(opts.services[0].id);
    } catch (e) {
      snackbar.error((e as Error).message);
      vendor = null;
    }
  }

  // 3. Service
  let serviceId = $state<number | null>(null);
  let unitId = $state<string | null>(null);
  let qty = $state(1);
  let chosen = $state<string[]>([]);
  const service = $derived(opts?.services.find((s) => s.id === serviceId) ?? null);
  function selectService(id: number) {
    serviceId = id;
    const s = opts?.services.find((x) => x.id === id);
    unitId = s?.units[0]?.unit_id ?? null;
    chosen = [];
    qty = 1;
  }

  // 4-5. Rendez-vous & coordonnees
  let date = $state("");
  let time = $state("");
  let name = $state("");
  let phone = $state("");
  let address = $state("");
  let districtId = $state<number | null>(null);
  let info = $state("");
  let coupon = $state("");

  // Prix : recalcule par le serveur a chaque changement de choix.
  let price = $state<Price | null>(null);
  let quoteErr = $state("");
  let qseq = 0;
  $effect(() => {
    if (!vendor || serviceId === null) {
      price = null;
      return;
    }
    const mine = ++qseq;
    const body = { ref: String(vendor.vendor_id), service_id: serviceId, unit_id: unitId, qty, options: [...chosen], coupon: coupon.trim() || null };
    quoteBooking(body)
      .then((p) => {
        if (mine === qseq) {
          price = p;
          quoteErr = "";
        }
      })
      .catch((e) => {
        if (mine === qseq) {
          price = null;
          quoteErr = (e as Error).message;
        }
      });
  });

  let saving = $state(false);
  const ready = $derived(!!client && !!vendor && serviceId !== null && !!date && !!time && name.trim().length >= 2 && phone.trim().length >= 6 && address.trim().length >= 3 && (!opts?.districts.length || districtId !== null));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!ready || !client || !vendor || serviceId === null) return;
    saving = true;
    try {
      const r = await adminCreateBooking({
        client_id: Number(client._id), ref: String(vendor.vendor_id), service_id: serviceId, unit_id: unitId, qty, options: [...chosen], coupon: coupon.trim() || null,
        date, time, name: name.trim(), phone: phone.trim(), address: address.trim(), info: info.trim() || null, district_id: districtId, payment: "cash",
      });
      snackbar.success(`Réservation ${r.ref} créée.`);
      await goto("/admin/reservations");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      saving = false;
    }
  }
</script>

<form class="page" onsubmit={submit}>
  <p class="desc">Créez une réservation pour un client (appel, WhatsApp…). Le prix est calculé par le serveur comme pour une réservation faite par le client, qui reçoit sa confirmation par e-mail. Le règlement est en espèces ; le client pourra payer en ligne depuis « Mes réservations ».</p>

  <section class="card">
    <h3><span class="n">1</span> Client</h3>
    {#if client}
      <div class="chosen"><div><strong>{client.client_name} {client.client_family_name ?? ""}</strong><small>{client.client_email} · {client.client_phone}</small></div><button type="button" class="link" onclick={() => (client = null)}>Changer</button></div>
    {:else}
      <label class="search"><Search size={15} /><input type="search" placeholder="Nom, e-mail ou téléphone du client…" bind:value={clientQ} oninput={searchClients} /></label>
      {#if clientBusy}<p class="muted">Recherche…</p>{/if}
      {#if clients.length}<ul class="res">{#each clients as c (c._id)}<li><button type="button" onclick={() => pickClient(c)}><strong>{c.client_name} {c.client_family_name ?? ""}</strong><small>{c.client_email} · {c.client_phone}</small></button></li>{/each}</ul>{:else if clientQ.trim().length >= 2 && !clientBusy}<p class="muted">Aucun client trouvé. Créez-le d'abord depuis le menu « Clients ».</p>{/if}
    {/if}
  </section>

  <section class="card" class:off={!client}>
    <h3><span class="n">2</span> Prestataire et service</h3>
    {#if vendor}
      <div class="chosen"><div><strong>{vendor.name}</strong><small>{vendor.city ?? ""}</small></div><button type="button" class="link" onclick={() => { vendor = null; opts = null; serviceId = null; }}>Changer</button></div>
    {:else}
      <label class="search"><Search size={15} /><input type="search" placeholder="Rechercher un prestataire…" bind:value={vendorQ} oninput={searchVendors} disabled={!client} /></label>
      {#if vendors.length}<ul class="res">{#each vendors as v (v.vendor_id)}<li><button type="button" onclick={() => pickVendor(v)}><strong>{v.name}</strong><small>{v.city ?? ""}</small></button></li>{/each}</ul>{/if}
    {/if}
    {#if opts}
      {#if opts.services.length === 0}
        <p class="muted">Ce prestataire n'a aucun service réservable.</p>
      {:else}
        <div class="svc">
          {#each opts.services as s (s.id)}
            <button type="button" class="opt" class:on={serviceId === s.id} onclick={() => selectService(s.id)}><span class="dot">{#if serviceId === s.id}<Check size={12} />{/if}</span><span><strong>{s.title}</strong>{#if s.units[0]}<small>dès {fmt(s.units[0].price)} FCFA</small>{/if}</span></button>
          {/each}
        </div>
        {#if service}
          <div class="row">
            {#if service.units.length > 1}
              <label>Formule<select bind:value={unitId}>{#each service.units as u (u.unit_id)}<option value={u.unit_id}>{u.label ?? "Standard"} — {fmt(u.price)} FCFA</option>{/each}</select></label>
            {/if}
            <label>Quantité<input type="number" min="1" max="50" bind:value={qty} /></label>
          </div>
          {#if service.options.length}
            <div class="chk">{#each service.options as o (o.name)}<label><input type="checkbox" value={o.name} bind:group={chosen} /> {o.name} (+{fmt(o.price)} FCFA)</label>{/each}</div>
          {/if}
        {/if}
      {/if}
    {/if}
  </section>

  <section class="card" class:off={serviceId === null}>
    <h3><span class="n">3</span> Rendez-vous et adresse</h3>
    <div class="row">
      <label>Date<DatePicker bind:value={date} min={today} /></label>
      <label>Heure<TimePicker bind:value={time} /></label>
    </div>
    <div class="row">
      <label>Nom du client<input type="text" bind:value={name} maxlength="120" /></label>
      <label>Téléphone (avec indicatif)<input type="tel" bind:value={phone} placeholder="+228 90 00 00 00" /></label>
    </div>
    <label>Adresse<input type="text" bind:value={address} maxlength="300" /></label>
    {#if opts?.districts.length}
      <label>Quartier<select bind:value={districtId}><option value={null}>Choisir…</option>{#each opts.districts as d (d.id)}<option value={d.id}>{d.name}</option>{/each}</select></label>
    {/if}
    <label>Précisions (accès, étage…)<textarea rows="3" bind:value={info} maxlength="1000"></textarea></label>
    <label>Code promo (optionnel)<input type="text" bind:value={coupon} maxlength="25" style:text-transform="uppercase" /></label>
  </section>

  <section class="card total">
    {#if price}
      <dl>
        <div><dt>Service</dt><dd>{fmt(price.service)} FCFA</dd></div>
        {#if price.options > 0}<div><dt>Options</dt><dd>{fmt(price.options)} FCFA</dd></div>{/if}
        <div><dt>Mise en relation</dt><dd>{fmt(price.linking)} FCFA</dd></div>
        {#if price.discount > 0}<div><dt>Réduction</dt><dd>− {fmt(price.discount)} FCFA</dd></div>{/if}
        <div class="t"><dt>Total</dt><dd>{fmt(price.total)} FCFA</dd></div>
      </dl>
    {:else if quoteErr}<p class="err">{quoteErr}</p>
    {:else}<p class="muted">Le prix s'affiche dès que le prestataire et le service sont choisis.</p>{/if}
    <div class="actions"><Btn type="submit" class="btn-primary" loading={saving} disabled={!ready}>Créer la réservation</Btn></div>
  </section>
</form>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; max-width: 52rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; }
  .card { display: flex; flex-direction: column; gap: 0.8rem; padding: 1.2rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
  .card.off { opacity: 0.55; pointer-events: none; }
  h3 { margin: 0; display: flex; align-items: center; gap: 0.6rem; font-size: 1rem; }
  .n { display: inline-grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #111827; color: #fff; font-size: 0.75rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; color: #374151; min-width: 0; }
  input[type="text"], input[type="tel"], input[type="number"], input[type="search"], select, textarea { padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-weight: 400; font-size: 0.9rem; background: #fff; width: 100%; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .search { position: relative; }
  .search :global(svg) { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
  .search input { padding-left: 2.2rem; }
  .res { list-style: none; margin: 0; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .res li + li { border-top: 1px solid #f1f2f4; }
  .res button { display: flex; flex-direction: column; align-items: flex-start; width: 100%; padding: 0.6rem 0.9rem; border: 0; background: #fff; cursor: pointer; text-align: left; font: inherit; }
  .res button:hover { background: #f3f7ff; }
  small { color: #6b7280; font-weight: 400; }
  .chosen { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; padding: 0.7rem 0.9rem; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; }
  .chosen div { display: flex; flex-direction: column; }
  .link { border: 0; background: none; color: #2563eb; font: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .svc { display: grid; gap: 0.5rem; }
  .opt { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.9rem; border: 1.5px solid #e5e7eb; border-radius: 12px; background: #fff; text-align: left; font: inherit; cursor: pointer; }
  .opt.on { border-color: #047857; background: #f0fdf4; }
  .opt span:last-child { display: flex; flex-direction: column; }
  .dot { display: grid; place-items: center; width: 1.2rem; height: 1.2rem; border-radius: 50%; border: 2px solid #c8cdc9; color: #fff; flex: none; }
  .opt.on .dot { background: #047857; border-color: #047857; }
  .chk { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; }
  .chk label { flex-direction: row; align-items: center; gap: 0.4rem; font-weight: 600; }
  .muted { margin: 0; color: #9ca3af; font-size: 0.85rem; }
  .err { margin: 0; color: #b42318; font-size: 0.88rem; }
  dl { margin: 0; display: grid; gap: 0.35rem; }
  dl div { display: flex; justify-content: space-between; font-size: 0.9rem; }
  dl dt { color: #6b7280; }
  dl .t { padding-top: 0.5rem; border-top: 2px solid #111827; font-size: 1.05rem; font-weight: 800; }
  dl .t dt { color: #111827; }
  .actions { display: flex; justify-content: flex-end; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
</style>
