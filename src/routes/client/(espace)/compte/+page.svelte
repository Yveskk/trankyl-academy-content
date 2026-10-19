<script lang="ts">
  import Camera from "@lucide/svelte/icons/camera";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Btn from "$lib/components/Btn.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PhoneField from "$lib/components/PhoneField.svelte";
  import { clientAccount } from "$lib/stores/clientAccount.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import { onMount } from "svelte";
  import CalendarCheck from "@lucide/svelte/icons/calendar-check";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import { myBookings, type MyBooking } from "$lib/api/bookings";
  import { clientActivity, removeClientPhoto, updateClientProfile, uploadClientPhoto, type AccountActivity } from "$lib/api/auth";
  import ImageLightbox from "$lib/components/ImageLightbox.svelte";
  import Seo from "$lib/components/Seo.svelte";

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const pending = new Pending();
  const me = $derived(clientAccount.me);

  let firstname = $state("");
  let lastname = $state("");
  let email = $state("");
  let editPhone = $state(false);
  let countryCode = $state("228");
  let phone = $state("");
  let profilePassword = $state("");
  let fileInput = $state<HTMLInputElement | undefined>();
  let preview = $state<string | null>(null);
  let zoom = $state(false);

  let filled = false;
  $effect(() => {
    if (me && !filled) {
      filled = true;
      firstname = me.firstname;
      lastname = me.lastname;
      email = me.email;
    }
  });

  const fullPhone = $derived(editPhone && phone.replace(/\D/g, "") ? `+${countryCode}${phone.replace(/\D/g, "")}` : "");
  const sensitiveChange = $derived(!!me && (email.trim().toLowerCase() !== me.email.toLowerCase() || !!fullPhone));
  const dirty = $derived(!!me && (firstname.trim() !== me.firstname || lastname.trim() !== me.lastname || sensitiveChange));
  const initials = $derived(`${me?.firstname?.[0] ?? ""}${me?.lastname?.[0] ?? ""}`.toUpperCase() || "?");

  async function onPick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return void snackbar.error(t("Choisissez une photo JPEG, PNG ou WEBP.", "Choose a JPEG, PNG or WEBP photo."));
    if (file.size > 3 * 1024 * 1024) return void snackbar.error(t("Photo trop volumineuse (3 Mo maximum).", "Photo too large (3 MB max)."));
    preview = URL.createObjectURL(file);
    await pending.run("photo", async () => {
      try {
        clientAccount.set(await uploadClientPhoto(file));
        snackbar.success(t("Photo de profil mise à jour.", "Profile photo updated."));
      } catch (e) {
        snackbar.error((e as Error).message);
      } finally {
        URL.revokeObjectURL(preview!);
        preview = null;
      }
    });
  }

  async function removePhoto() {
    const ok = await confirmDialog.ask({
      title: t("Supprimer ma photo ?", "Remove my photo?"),
      message: t("Vos initiales seront affichées à la place.", "Your initials will be shown instead."),
      confirmLabel: t("Supprimer", "Remove"),
      tone: "danger",
      action: async () => clientAccount.set(await removeClientPhoto()),
    });
    if (ok) snackbar.success(t("Photo supprimée.", "Photo removed."));
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!me || !dirty) return;
    if (!firstname.trim()) return void snackbar.error(t("Le prénom est obligatoire.", "First name is required."));
    if (sensitiveChange && !profilePassword) return void snackbar.error(t("Saisissez votre mot de passe actuel pour changer l'e-mail ou le téléphone.", "Enter your current password to change your email or phone."));
    await pending.run("profile", async () => {
      try {
        const payload: Record<string, string> = { firstname: firstname.trim(), lastname: lastname.trim() };
        if (email.trim().toLowerCase() !== me.email.toLowerCase()) payload.email = email.trim();
        if (fullPhone) payload.phone = fullPhone;
        if (sensitiveChange) payload.current_password = profilePassword;
        const c = await updateClientProfile(payload);
        clientAccount.set(c);
        email = c.email;
        editPhone = false;
        phone = "";
        profilePassword = "";
        snackbar.success(t("Vos informations ont été mises à jour.", "Your details have been updated."));
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  let bookings = $state<MyBooking[]>([]);
  let activity = $state<AccountActivity[]>([]);
  let loading = $state(true);

  onMount(async () => {
    [bookings, activity] = await Promise.all([myBookings().catch(() => []), clientActivity().catch(() => [])]);
    loading = false;
  });

    const open = $derived(bookings.filter((b) => b.status === "pending").length);
  const done = $derived(bookings.filter((b) => b.status === "completed").length);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(en ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

</script>
<Seo title={t("Mon compte", "My account")} description={t("Votre profil, vos informations et l'activité de votre compte.", "Your profile, details and account activity.")} noindex />

{#if me?.image}<ImageLightbox src={me.image} alt={t("Ma photo de profil", "My profile photo")} bind:open={zoom} />{/if}

<div class="ac">
  <div class="ac-head">
    <h1>{t("Bonjour", "Hello")}{me ? `, ${me.firstname}` : ""} 👋</h1>
    <p>{t("Retrouvez ici vos réservations, vos demandes et les réglages de votre compte.", "Find your bookings, requests and account settings here.")}</p>
  </div>

  <div class="ac-tiles">
    <a class="ac-tile" href="/client/reservations"><CalendarCheck size={22} /><strong>{loading ? "…" : open}</strong><span>{t("réservation(s) en cours", "booking(s) in progress")}</span></a>
    <a class="ac-tile" href="/client/reservations"><CircleCheck size={22} /><strong>{loading ? "…" : done}</strong><span>{t("prestation(s) terminée(s)", "completed service(s)")}</span></a>
    <a class="ac-tile" href="/client/messagerie"><MessagesSquare size={22} /><strong>{t("Mes demandes", "My requests")}</strong><span>{t("Échanger avec les prestataires", "Chat with providers")}</span></a>
  </div>

  <div class="ac-cols">
    <div class="ac-col">
  <section class="ac-card">
    <h2>{t("Photo de profil", "Profile photo")}</h2>
    <div class="ac-photo">
      {#if me?.image && !preview}
        <button type="button" class="ac-avatar ac-zoomable" class:busy={pending.is("photo")} title={t("Voir en grand", "View larger")} aria-label={t("Voir la photo en grand", "View photo larger")} onclick={() => (zoom = true)}>
          <img src={me.image} alt={t("Ma photo de profil", "My profile photo")} />
        </button>
      {:else}
        <span class="ac-avatar" class:busy={pending.is("photo")}>
          {#if preview}<img src={preview} alt="" />{:else}{initials}{/if}
        </span>
      {/if}
      <div class="ac-photo-actions">
        <input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onchange={onPick} />
        <Btn class="btn-primary btn-sm" loading={pending.is("photo")} onclick={() => fileInput?.click()}><Camera size={15} /> {me?.image ? t("Changer la photo", "Change photo") : t("Ajouter une photo", "Add a photo")}</Btn>
        {#if me?.image}<Btn class="btn-outline btn-sm" disabled={pending.is("photo")} onclick={removePhoto}><Trash2 size={15} /> {t("Supprimer", "Remove")}</Btn>{/if}
        <p class="ac-muted">{t("JPEG, PNG ou WEBP · 3 Mo maximum.", "JPEG, PNG or WEBP · 3 MB max.")}</p>
      </div>
    </div>
  </section>
  <section class="ac-card">
    <h2>{t("Informations personnelles", "Personal details")}</h2>
    {#if me}
      <form onsubmit={save} novalidate>
        <div class="ac-grid2">
          <div class="field"><label for="fn">{t("Prénoms", "First names")}</label><input id="fn" bind:value={firstname} maxlength="80" autocomplete="given-name" /></div>
          <div class="field"><label for="ln">{t("Nom", "Last name")}</label><input id="ln" bind:value={lastname} maxlength="120" autocomplete="family-name" /></div>
        </div>
        <div class="ac-grid2">
          <div class="field"><label for="em">Email</label><input id="em" type="email" bind:value={email} maxlength="190" autocomplete="email" autocapitalize="none" spellcheck="false" /></div>
        <div class="field">
          {#if editPhone}
            <PhoneField bind:countryCode bind:phone label={t("Nouveau téléphone", "New phone")} required={false} />
            <button type="button" class="ac-link" onclick={() => { editPhone = false; phone = ""; }}>{t("Garder le numéro actuel", "Keep current number")}</button>
          {:else}
            <label for="curphone">{t("Téléphone", "Phone")}</label>
            <div class="ac-phone"><input id="curphone" value={me.phone ?? "—"} disabled /><button type="button" class="ac-link" onclick={() => (editPhone = true)}><Pencil size={13} /> {t("Modifier", "Change")}</button></div>
          {/if}
        </div>
        </div>
        {#if sensitiveChange}
          <div class="field">
            <label for="pp">{t("Mot de passe actuel", "Current password")}</label>
            <PasswordInput id="pp" bind:value={profilePassword} autocomplete="current-password" />
            <p class="hint">{t("L'e-mail et le téléphone servent à vous connecter : nous vérifions que c'est bien vous.", "Email and phone are used to sign in: we check it's really you.")}</p>
          </div>
        {/if}
        <div class="ac-actions"><Btn type="submit" class="btn-primary" loading={pending.is("profile")} disabled={!dirty}>{t("Enregistrer", "Save")}</Btn></div>
      </form>
    {:else}
      <p class="ac-muted">{t("Chargement…", "Loading…")}</p>
    {/if}
  </section>
    </div>
    <div class="ac-col">
  <section class="ac-card">
    <h2>{t("Activité récente", "Recent activity")}</h2>
    {#if loading}
      <p class="ac-muted">{t("Chargement…", "Loading…")}</p>
    {:else if activity.length === 0}
      <p class="ac-muted">{t("Aucune activité.", "No activity.")}</p>
    {:else}
      <ul class="ac-log">
        {#each activity.slice(0, 6) as a, i (i)}
          <li class:bad={!a.success}><span>{a.label}</span><small>{when(a.at)}</small></li>
        {/each}
      </ul>
      <a class="ac-more" href="/client/compte/securite">{t("Voir tout dans Sécurité", "See all in Security")} →</a>
    {/if}
  </section>
    </div>
  </div>
</div>
<style>
  .ac { display: flex; flex-direction: column; gap: 1.1rem; }
  .ac-head h1 { margin: 0 0 0.25rem; font-size: clamp(1.5rem, 3vw, 2rem); }
  .ac-head p { margin: 0; color: var(--muted, #6b7280); }
  .ac-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; }
  .ac-tile { display: flex; flex-direction: column; gap: 0.25rem; padding: 1.1rem; background: #fff; border: 1px solid var(--border, #e4dcc0); border-radius: 16px; text-decoration: none; color: inherit; transition: border-color 0.15s, transform 0.15s; }
  .ac-tile:hover { border-color: #03a71a; transform: translateY(-1px); }
  .ac-tile :global(svg) { color: #03a71a; }
  .ac-tile strong { font-size: 1.4rem; }
  .ac-tile span { font-size: 0.82rem; color: var(--muted, #6b7280); }
  .ac-card { background: #fff; border: 1px solid var(--border, #e4dcc0); border-radius: 16px; padding: 1.3rem; display: flex; flex-direction: column; gap: 0.7rem; }
  .ac-card h2 { margin: 0; font-size: 1.05rem; }
  .ac-muted { margin: 0; color: var(--muted, #6b7280); font-size: 0.88rem; }
  .ac-log { list-style: none; margin: 0; padding: 0; }
  .ac-log li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid #eee; font-size: 0.88rem; }
  .ac-log li.bad span { color: var(--danger, #b91c1c); }
  .ac-log small { color: var(--muted, #6b7280); }
  .ac-more { font-weight: 700; font-size: 0.85rem; color: #03a71a; text-decoration: none; align-self: flex-start; }
  @media (max-width: 640px) { .ac-tiles { grid-template-columns: 1fr; } }

  .ac-card form { display: flex; flex-direction: column; gap: 0.9rem; max-width: none; width: 100%; }
  .ac-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
  .ac-actions { display: flex; justify-content: flex-end; }
  .ac-muted { margin: 0; color: var(--muted, #6b7280); font-size: 0.82rem; }
  .ac-photo { display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap; }
  .ac-avatar { width: 6rem; height: 6rem; border-radius: 50%; background: linear-gradient(135deg, #04330d, #03a71a); color: #ffc72c; display: grid; place-items: center; font-weight: 800; font-size: 1.7rem; overflow: hidden; flex: none; border: 3px solid #fff; box-shadow: 0 0 0 2px #e4dcc0; transition: opacity 0.2s; }
  .ac-zoomable { padding: 0; cursor: zoom-in; font: inherit; }
  .ac-zoomable:hover { box-shadow: 0 0 0 3px #03a71a; }
  .ac-avatar.busy { opacity: 0.55; }
  .ac-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ac-photo-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
  .ac-photo-actions .ac-muted { flex-basis: 100%; }
  .ac-phone { display: flex; align-items: center; gap: 0.8rem; }
  .ac-phone input { flex: 1; }
  .ac-link { background: none; border: none; color: #03a71a; font: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0; align-self: flex-start; }
  .ac-cols { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1.1rem; align-items: start; }
  .ac-col { display: flex; flex-direction: column; gap: 1.1rem; min-width: 0; }
  @media (max-width: 1100px) { .ac-cols { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 640px) { .ac-tiles, .ac-grid2 { grid-template-columns: 1fr; } }
</style>
