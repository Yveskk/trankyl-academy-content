<script lang="ts">
  import DateRangePicker from "$lib/components/datetime/DateRangePicker.svelte";
  import DatePicker from "$lib/components/datetime/DatePicker.svelte";
  import TimePicker from "$lib/components/datetime/TimePicker.svelte";
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Calendar from "@lucide/svelte/icons/calendar";
  import CalendarX from "@lucide/svelte/icons/calendar-x";
  import CreditCard from "@lucide/svelte/icons/credit-card";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Phone from "@lucide/svelte/icons/phone";
  import Wallet from "@lucide/svelte/icons/wallet";
  import { cancelBooking, editBooking, myBookings, payBooking, type MyBooking, type PayMode } from "$lib/api/bookings";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PayOptions from "$lib/components/PayOptions.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const fmt = (v: string | number) => Number(v).toLocaleString(en ? "en-US" : "fr-FR").replace(/ | /g, " ");

  type Filter = "all" | "pending" | "completed" | "cancelled";
  let items = $state<MyBooking[]>([]);
  let loading = $state(true);
  let filter = $state<Filter>("all");

  $effect(() => {
    if (auth.role !== "client") goto("/client/login?redirect=%2Fclient%2Freservations");
  });

  async function load(silent = false) {
    if (!silent) loading = true;
    try {
      items = await myBookings();
    } catch (e) {
      if (!silent) snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(() => load());

  // Filtre par date du rendez-vous (periode « du … au … », bornes incluses) ; les dates sont au format AAAA-MM-JJ, comparables telles quelles.
  let dateFrom = $state("");
  let dateTo = $state("");
  const inRange = (b: MyBooking) => (!dateFrom || (!!b.date && b.date >= dateFrom)) && (!dateTo || (!!b.date && b.date <= dateTo));
  const filtered = $derived(items.filter(inRange));
  const shown = $derived(filter === "all" ? filtered : filtered.filter((b) => b.status === filter));
  const hasDates = $derived(!!dateFrom || !!dateTo);
  const counts = $derived({
    all: filtered.length,
    pending: filtered.filter((b) => b.status === "pending").length,
    completed: filtered.filter((b) => b.status === "completed").length,
    cancelled: filtered.filter((b) => b.status === "cancelled").length,
  });

  const STATUS = $derived({
    pending: { label: t("En attente", "Pending"), cls: "pending" },
    completed: { label: t("Terminée", "Completed"), cls: "done" },
    cancelled: { label: t("Annulée", "Cancelled"), cls: "cancelled" },
  });
  const when = (b: MyBooking) =>
    b.date ? `${new Date(b.date + "T12:00:00").toLocaleDateString(en ? "en-GB" : "fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" })} · ${b.time}` : b.time;
  const initials = (n: string | null) => (n ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // ---------------------------------------------------------------- paiement en ligne
  let payTarget = $state<MyBooking | null>(null);
  let payMode = $state<PayMode>("ALL");
  let payBusy = $state(false);
  let watching: { id: number; until: number } | null = null;
  let watchTimer: ReturnType<typeof setTimeout> | undefined;

  function openPay(b: MyBooking) {
    payTarget = b;
    payMode = b.payment.options[0]?.mode ?? "ALL";
  }

  // Apres l'ouverture de la page de paiement, on relit les reservations toutes les 6 s (15 min max) : le statut se met a jour tout seul.
  function watch(id: number) {
    watching = { id, until: Date.now() + 15 * 60_000 };
    clearTimeout(watchTimer);
    const tick = async () => {
      if (!watching || Date.now() > watching.until) return;
      const before = items.find((x) => x.id === watching!.id)?.payment.paid ?? 0;
      await load(true);
      const after = items.find((x) => x.id === watching!.id)?.payment.paid ?? 0;
      if (after > before) {
        snackbar.success(t("Paiement reçu. Merci !", "Payment received. Thank you!"));
        watching = null;
        return;
      }
      watchTimer = setTimeout(tick, 6000);
    };
    watchTimer = setTimeout(tick, 6000);
  }
  onDestroy(() => clearTimeout(watchTimer));

  // Page de paiement SEMOA : l'onglet est ouvert AVANT l'appel reseau (sinon le navigateur bloque la fenetre).
  async function confirmPay() {
    if (!payTarget) return;
    const b = payTarget;
    const tab = window.open("", "_blank");
    payBusy = true;
    try {
      const r = await payBooking(b.id, payMode);
      if (tab) tab.location.href = r.invoice.bill_url;
      else window.location.href = r.invoice.bill_url;
      payTarget = null;
      watch(b.id);
    } catch (err) {
      tab?.close();
      snackbar.error((err as Error).message);
    } finally {
      payBusy = false;
    }
  }

  // ---------------------------------------------------------------- modification (reservation en attente)
  let editTarget = $state<MyBooking | null>(null);
  let eDate = $state("");
  let eTime = $state("");
  let eName = $state("");
  let ePhone = $state("");
  let eAddress = $state("");
  let eInfo = $state("");
  let editBusy = $state(false);
  const today = new Date().toISOString().slice(0, 10);

  function openEdit(b: MyBooking) {
    editTarget = b;
    eDate = b.date ?? "";
    eTime = b.time ?? "";
    eName = b.client_name ?? "";
    ePhone = b.client_phone ?? "";
    eAddress = b.address ?? "";
    eInfo = b.info ?? "";
  }
  async function saveEdit(event: SubmitEvent) {
    event.preventDefault();
    if (!editTarget) return;
    editBusy = true;
    try {
      await editBooking(editTarget.id, { date: eDate, time: eTime, name: eName.trim(), phone: ePhone.trim(), address: eAddress.trim(), info: eInfo.trim() || null });
      snackbar.success(t("Réservation modifiée.", "Booking updated."));
      editTarget = null;
      await load(true);
    } catch (err) {
      snackbar.error((err as Error).message);
    } finally {
      editBusy = false;
    }
  }

  async function cancel(b: MyBooking) {
    const ok = await confirmDialog.ask({
      title: t(`Annuler la réservation ${b.ref} ?`, `Cancel booking ${b.ref}?`),
      message: t("Le prestataire sera informé. Cette action est définitive.", "The provider will be informed. This cannot be undone."),
      confirmLabel: t("Annuler la réservation", "Cancel booking"),
      cancelLabel: t("Garder", "Keep"),
      tone: "danger",
      action: async () => {
        await cancelBooking(b.id);
        await load(true);
      },
    });
    if (ok) snackbar.success(t("Réservation annulée.", "Booking cancelled."));
  }

  // Libelle du bouton de paiement selon l'etat : jamais paye, partiellement paye, ou paiement en ligne non abouti.
  function payLabel(b: MyBooking) {
    if (b.payment.status === "partial") return t("Payer le solde", "Pay the balance");
    return b.payment_method === "ligne" ? t("Relancer le paiement", "Retry payment") : t("Payer en ligne", "Pay online");
  }
  function payState(b: MyBooking) {
    const p = b.payment;
    if (p.status === "paid") return { cls: "ok", label: t("Payée", "Paid") };
    if (p.status === "partial") return { cls: "part", label: t("Partiellement payée", "Partly paid") };
    return b.payment_method === "ligne" ? { cls: "wait", label: t("Paiement en ligne en attente", "Online payment pending") } : { cls: "cash", label: t("À régler en espèces", "To be paid in cash") };
  }
</script>

<Seo title={t("Mes réservations", "My bookings")} description={t("Suivez vos réservations.", "Follow your bookings.")} noindex />

<section class="rs">
  <header>
    <div>
      <h1>{t("Mes réservations", "My bookings")}</h1>
      <p class="lead">{t("Suivez, modifiez et réglez vos réservations.", "Track, edit and pay your bookings.")}</p>
    </div>
    <div class="filters" role="tablist">
      {#each ["all", "pending", "completed", "cancelled"] as f}
        <button type="button" role="tab" aria-selected={filter === f} class:on={filter === f} onclick={() => (filter = f as Filter)}>
          {f === "all" ? t("Toutes", "All") : STATUS[f as "pending" | "completed" | "cancelled"].label}<span class="n">{counts[f as Filter]}</span>
        </button>
      {/each}
    </div>
  </header>

  <div class="datebar">
    <div class="range"><DateRangePicker bind:from={dateFrom} bind:to={dateTo} placeholder={t("Filtrer par date de rendez-vous", "Filter by appointment date")} /></div>
  </div>

  {#if loading}
    <div class="skeleton" aria-busy="true">{#each [1, 2, 3] as n (n)}<div class="sk"></div>{/each}</div>
  {:else if shown.length === 0}
    <div class="empty">
      <CalendarX size={34} />
      <p>{items.length === 0 ? t("Vous n'avez pas encore de réservation.", "You have no bookings yet.") : hasDates ? t("Aucune réservation sur cette période.", "No bookings in this period.") : t("Aucune réservation dans cette catégorie.", "No bookings in this category.")}</p>
      <a class="btn btn-gold" href="/recherche">{t("Trouver un prestataire", "Find a provider")}</a>
    </div>
  {:else}
    <ul class="list">
      {#each shown as b (b.id)}
        {@const ps = payState(b)}
        {@const pct = b.payment.total > 0 ? Math.min(100, Math.round((b.payment.paid / b.payment.total) * 100)) : 0}
        <li class="bk {STATUS[b.status].cls}">
          <div class="top">
            <span class="ref">{b.ref}</span>
            <span class="st {STATUS[b.status].cls}">{STATUS[b.status].label}</span>
          </div>

          <div class="head">
            <span class="av">{initials(b.vendor_name)}</span>
            <div>
              <h3>{b.service ?? t("Service", "Service")}{Number(b.qty) > 1 ? ` × ${b.qty}` : ""}</h3>
              <a class="vendor" href="/profil/{b.vendor_id}">{b.vendor_name ?? t("Prestataire", "Provider")}</a>
            </div>
            <strong class="total">{fmt(b.total)} <small>FCFA</small></strong>
          </div>

          <div class="facts">
            <p><Calendar size={15} /><span>{when(b)}</span></p>
            <p><MapPin size={15} /><span>{b.address}</span></p>
            {#if b.client_phone}<p><Phone size={15} /><span>{b.client_phone}</span></p>{/if}
          </div>

          {#if b.status !== "cancelled"}
            <div class="pay {ps.cls}">
              <div class="pay-top">
                <span class="pay-l">{#if b.payment_method === "ligne"}<CreditCard size={15} />{:else}<Wallet size={15} />{/if}{ps.label}</span>
                <span class="pay-r">{fmt(b.payment.paid)} / {fmt(b.payment.total)} FCFA</span>
              </div>
              <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><span style:width="{pct}%"></span></div>
              <div class="parts">
                <span class:done={b.payment.linking_paid}>{b.payment.linking_paid ? "✓" : "○"} {t("Mise en relation", "Connection fee")} · {fmt(b.payment.linking)} FCFA</span>
                <span class:done={b.payment.service_paid}>{b.payment.service_paid ? "✓" : "○"} {t("Service", "Service")} · {fmt(b.payment.service)} FCFA</span>
              </div>
            </div>
          {/if}

          {#if b.status === "pending"}
            <div class="actions">
              {#if b.payment.options.length}
                <button type="button" class="act primary" onclick={() => openPay(b)}><CreditCard size={15} />{payLabel(b)}</button>
              {/if}
              <button type="button" class="act" onclick={() => openEdit(b)}><Pencil size={15} />{t("Modifier", "Edit")}</button>
              <button type="button" class="act danger" onclick={() => cancel(b)}>{t("Annuler", "Cancel")}</button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<Modal open={payTarget !== null} title={t("Paiement en ligne", "Online payment")} subtitle={payTarget ? `${payTarget.ref} · ${payTarget.service ?? ""}` : ""} width="32rem" locked={payBusy} onclose={() => (payTarget = null)}>
  {#if payTarget}
    <p class="mhint">{t("Choisissez ce que vous réglez maintenant. Mobile Money ou carte, sur une page de paiement sécurisée.", "Choose what you pay now. Mobile Money or card, on a secure payment page.")}</p>
    <PayOptions options={payTarget.payment.options} bind:value={payMode} name="mine-pay" />
  {/if}
  {#snippet footer()}
    <Btn class="btn-outline" disabled={payBusy} onclick={() => (payTarget = null)}>{t("Fermer", "Close")}</Btn>
    <Btn class="btn-gold" loading={payBusy} onclick={confirmPay}>{t("Continuer vers le paiement", "Continue to payment")}</Btn>
  {/snippet}
</Modal>

<Modal open={editTarget !== null} title={t("Modifier la réservation", "Edit booking")} subtitle={editTarget ? `${editTarget.ref} · ${editTarget.service ?? ""}` : ""} width="34rem" locked={editBusy} onclose={() => (editTarget = null)}>
  <form id="edit-bk" class="eform" onsubmit={saveEdit}>
    <div class="two">
      <label>{t("Date", "Date")}<DatePicker bind:value={eDate} min={today} required /></label>
      <label>{t("Heure", "Time")}<TimePicker bind:value={eTime} required /></label>
    </div>
    <label>{t("Nom complet", "Full name")}<input type="text" bind:value={eName} required minlength="2" maxlength="120" autocomplete="name" /></label>
    <label>{t("Téléphone", "Phone")}<input type="tel" bind:value={ePhone} required placeholder="+228 90 00 00 00" autocomplete="tel" /></label>
    <label>{t("Adresse", "Address")}<input type="text" bind:value={eAddress} required minlength="3" maxlength="300" /></label>
    <label>{t("Précisions (accès, étage…)", "Details (access, floor…)")}<textarea rows="3" bind:value={eInfo} maxlength="1000"></textarea></label>
    <p class="mhint">{t("Le service, le prestataire et le prix ne changent pas. Pour un autre service, annulez et réservez à nouveau.", "The service, provider and price do not change. For another service, cancel and book again.")}</p>
  </form>
  {#snippet footer()}
    <Btn class="btn-outline" disabled={editBusy} onclick={() => (editTarget = null)}>{t("Annuler", "Cancel")}</Btn>
    <Btn type="submit" form="edit-bk" class="btn-gold" loading={editBusy}>{t("Enregistrer", "Save")}</Btn>
  {/snippet}
</Modal>

<style>
  .rs {
    width: 100%;
    margin: 0 0 2rem;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.4rem;
  }
  h1 {
    margin: 0;
    font-size: clamp(1.6rem, 3vw, 2.1rem);
  }
  .lead {
    margin: 0.25rem 0 0;
    color: var(--ink-soft, #4b5563);
    font-size: 0.95rem;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .filters button {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid var(--border, #e4dcc0);
    background: #fff;
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .filters button.on {
    background: var(--green-deep, #04330d);
    border-color: var(--green-deep, #04330d);
    color: #fff;
  }
  .n {
    min-width: 1.3rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
    font-size: 0.72rem;
    text-align: center;
  }
  .filters button.on .n {
    background: rgba(255, 255, 255, 0.22);
  }
  .datebar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem 1rem;
    margin: -0.4rem 0 1.2rem;
  }
  .datebar .range {
    width: min(21rem, 100%);
  }
  .list {
    display: grid;
    gap: 1rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .bk {
    position: relative;
    display: grid;
    gap: 0.95rem;
    padding: 1.2rem 1.3rem 1.2rem 1.5rem;
    background: #fff;
    border: 1px solid var(--border, #e9e9e3);
    border-radius: 18px;
    box-shadow: 0 1px 2px rgba(15, 23, 32, 0.04), 0 8px 24px rgba(15, 23, 32, 0.04);
    overflow: hidden;
  }
  .bk::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: var(--gold, #ffc72c);
  }
  .bk.done::before {
    background: var(--green, #0f7d41);
  }
  .bk.cancelled::before {
    background: #cbd0cc;
  }
  .bk.cancelled {
    opacity: 0.78;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.2rem 0.55rem;
    border-radius: 8px;
    background: #f3f2ec;
    color: #4b5563;
  }
  .st {
    padding: 0.22rem 0.7rem;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 800;
  }
  .st.pending {
    background: #fff3cc;
    color: #8a6800;
  }
  .st.done {
    background: #e2f3e8;
    color: var(--green-deep, #04330d);
  }
  .st.cancelled {
    background: #ececef;
    color: #4b5563;
  }
  .head {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.85rem;
  }
  .av {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: var(--green-soft, #e6f7e8);
    color: var(--green-deep, #04330d);
    font-weight: 800;
  }
  h3 {
    margin: 0;
    font-size: 1.08rem;
  }
  .vendor {
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--green, #0f7d41);
  }
  .total {
    font-size: 1.3rem;
    white-space: nowrap;
  }
  .total small {
    font-size: 0.72rem;
    color: #6b7280;
  }
  .facts {
    display: grid;
    gap: 0.4rem;
    padding: 0.8rem 0.95rem;
    border-radius: 12px;
    background: #faf9f4;
  }
  .facts p {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    margin: 0;
    font-size: 0.88rem;
    color: #374151;
  }
  .facts :global(svg) {
    flex: none;
    margin-top: 0.12rem;
    color: #8a6800;
  }
  .pay {
    display: grid;
    gap: 0.5rem;
    padding: 0.85rem 0.95rem;
    border-radius: 12px;
    border: 1px solid #ece7d2;
    background: #fff;
  }
  .pay.ok {
    background: #f1faf3;
    border-color: #bfe3c8;
  }
  .pay.part {
    background: #fffaf0;
    border-color: #f1d56a;
  }
  .pay-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.4rem;
    font-size: 0.86rem;
  }
  .pay-l {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 800;
  }
  .pay-r {
    color: #6b7280;
    font-weight: 600;
  }
  .bar {
    height: 7px;
    border-radius: 999px;
    background: #ecebe4;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--green, #0f7d41);
    transition: width 0.4s ease;
  }
  .parts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    font-size: 0.78rem;
    color: #6b7280;
  }
  .parts .done {
    color: var(--green, #0f7d41);
    font-weight: 700;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .act {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 12px;
    border: 1.5px solid var(--green-deep, #04330d);
    background: #fff;
    color: var(--green-deep, #04330d);
    font: inherit;
    font-weight: 800;
    font-size: 0.86rem;
    cursor: pointer;
    transition: transform 0.12s, background 0.12s;
  }
  .act:hover {
    transform: translateY(-1px);
    background: #f6f5ee;
  }
  .act.primary {
    background: var(--gold, #ffc72c);
    border-color: var(--gold, #ffc72c);
  }
  .act.primary:hover {
    background: #ffd25a;
  }
  .act.danger {
    margin-left: auto;
    border-color: #f1c4c4;
    color: #b42318;
  }
  .act.danger:hover {
    background: #fef2f2;
  }
  .skeleton {
    display: grid;
    gap: 1rem;
  }
  .sk {
    height: 14rem;
    border-radius: 18px;
    background: linear-gradient(90deg, #f1f0ea 25%, #f8f7f2 50%, #f1f0ea 75%);
    background-size: 200% 100%;
    animation: sh 1.2s linear infinite;
  }
  @keyframes sh {
    to {
      background-position: -200% 0;
    }
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: 0.7rem;
    padding: 3.5rem 1rem;
    color: #8a8f8c;
    text-align: center;
  }
  .empty p {
    margin: 0;
  }
  .mhint {
    margin: 0 0 0.9rem;
    font-size: 0.85rem;
    color: #6b7280;
  }
  .eform {
    display: grid;
    gap: 0.75rem;
  }
  .eform .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .eform label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .eform input,
  .eform textarea {
    padding: 0.62rem 0.8rem;
    border: 1.5px solid var(--border, #e4dcc0);
    border-radius: 12px;
    font: inherit;
    font-weight: 400;
    font-size: 0.9rem;
  }
  .eform input:focus,
  .eform textarea:focus {
    outline: none;
    border-color: var(--green, #0f7d41);
    box-shadow: 0 0 0 3px rgba(15, 125, 65, 0.12);
  }
  @media (max-width: 640px) {
    .head {
      grid-template-columns: auto 1fr;
    }
    .total {
      grid-column: 1 / -1;
    }
    .act.danger {
      margin-left: 0;
    }
    .eform .two {
      grid-template-columns: 1fr;
    }
  }
</style>
