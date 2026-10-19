<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Plus from "@lucide/svelte/icons/plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import Btn from "$lib/components/Btn.svelte";
  import {
    activateVendorSubscription, anonymizeVendor, deactivateVendorSubscription, deleteVendor, deleteVendorService, getVendor, restoreVendor, setVendorActive, setVendorServiceActive,
    updateVendor, vendorDeletionPreview, vendorServices, type DeletionPreview, type VendorDetail,
  } from "$lib/api/adminVendors";
  import type { ServiceCard } from "$lib/api/providerServices";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { i18n } from "$lib/stores/locale.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const id = Number($page.params.id);
  let canManage = $derived(auth.can("academy.providers.manage"));
  const pending = new Pending();
  let tab = $state<"account" | "services" | "subscription" | "danger">("account");
  let v = $state<VendorDetail | null>(null);
  let services = $state<ServiceCard[]>([]);
  let svcLoaded = $state(false);
  let preview = $state<DeletionPreview | null>(null);
  let form = $state({ firstname: "", lastname: "", email: "", sex: "", city: "", address: "", bio: "", referral_code: "", academy_status: "provider", verified: false });

  function fill(d: VendorDetail) {
    form = { firstname: d.firstname ?? "", lastname: d.lastname ?? "", email: d.email ?? "", sex: d.sex ?? "", city: d.city ?? "", address: d.address ?? "", bio: d.bio ?? "", referral_code: d.referral_code ?? "", academy_status: d.academy_status ?? "provider", verified: d.verified };
  }
  async function load() {
    try {
      v = await getVendor(id);
      fill(v);
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
  async function loadServices() {
    try {
      services = (await vendorServices(id, i18n.locale)).items;
      svcLoaded = true;
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
  onMount(load);
  $effect(() => {
    if (tab === "services" && !svcLoaded) loadServices();
    if (tab === "danger" && !preview) vendorDeletionPreview(id).then((p) => (preview = p)).catch((e) => snackbar.error((e as Error).message));
  });

  async function save() {
    await pending.run("save", async () => {
      try {
        await updateVendor(id, { ...form, lastname: form.lastname || null, email: form.email || null, sex: form.sex || null, city: form.city || null, address: form.address || null, bio: form.bio || null, referral_code: form.referral_code || null });
        snackbar.success("Fiche enregistrée.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function toggleActive() {
    if (!v) return;
    await pending.run("active", async () => {
      try {
        await setVendorActive(id, !v!.is_active);
        snackbar.success(v!.is_active ? "Compte désactivé." : "Compte activé.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function toggleService(s: ServiceCard) {
    const next = !s.is_active;
    s.is_active = next;
    try {
      await setVendorServiceActive(id, s.id, next);
    } catch (e) {
      s.is_active = !next;
      snackbar.error((e as Error).message);
    }
  }
  async function removeService(s: ServiceCard) {
    await confirmDialog.ask({
      title: "Supprimer ce service ?",
      message: s.stats.bookings > 0 ? `« ${s.title} » a déjà ${s.stats.bookings} réservation(s) : il sera archivé (historique conservé).` : `« ${s.title} » sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await deleteVendorService(id, s.id);
        services = services.filter((x) => x.id !== s.id);
        snackbar.success("Service supprimé.");
      },
    });
  }
  // ---- abonnement
  let period = $state<"monthly" | "yearly">("monthly");
  let amount = $state("");
  async function activate() {
    await pending.run("sub", async () => {
      try {
        await activateVendorSubscription(id, period, amount.trim() ? Math.round(Number(amount)) : undefined);
        snackbar.success("Abonnement activé.");
        amount = "";
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function deactivate() {
    await confirmDialog.ask({
      title: "Désactiver l'abonnement ?",
      message: "Le prestataire n'aura plus d'abonnement actif. Les périodes déjà payées ne sont pas remboursées.",
      confirmLabel: "Désactiver",
      tone: "danger",
      action: async () => {
        await deactivateVendorSubscription(id);
        snackbar.success("Abonnement désactivé.");
        await load();
      },
    });
  }
  // ---- corbeille / anonymisation
  async function trash() {
    await confirmDialog.ask({
      title: "Mettre ce prestataire à la corbeille ?",
      message: `Le compte est désactivé et masqué du site. Les données personnelles seront anonymisées après ${preview?.grace_days ?? 30} jours ; une restauration reste possible d'ici là.`,
      confirmLabel: "Mettre à la corbeille",
      tone: "danger",
      action: async () => {
        await deleteVendor(id);
        snackbar.success("Prestataire mis à la corbeille.");
        await load();
        preview = null;
      },
    });
  }
  async function restore() {
    await pending.run("restore", async () => {
      try {
        await restoreVendor(id);
        snackbar.success("Compte restauré.");
        await load();
        preview = null;
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  let confirmText = $state("");
  async function anonymizeNow() {
    await pending.run("anon", async () => {
      try {
        await anonymizeVendor(id, confirmText);
        snackbar.success("Compte anonymisé.");
        confirmText = "";
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");
  const SUB = { active: "Actif", expired: "Expiré", paid: "Payé", pending: "En attente" } as const;
</script>

<div class="page">
  <a class="back" href="/admin/prestataires"><ArrowLeft size={15} /> Tous les prestataires</a>
  {#if !v}<div class="state">Chargement…</div>
  {:else}
    <header class="top">
      <span class="av">{#if v.photo}<img src={v.photo} alt="" />{:else}{v.firstname.slice(0, 1).toUpperCase()}{/if}</span>
      <div class="id"><h2>{v.firstname} {v.lastname ?? ""}{#if v.verified}<BadgeCheck size={18} class="vf" />{/if}</h2><p>{v.unique_id} · {v.phone}{v.email ? ` · ${v.email}` : ""} · inscrit le {date(v.created_at)}</p>
        <div class="bs">{#if v.deleted}<span class="b del">Corbeille</span>{:else}<span class="b" class:ok={v.is_active} class:off={!v.is_active}>{v.is_active ? "Actif" : "Désactivé"}</span>{/if}
          <span class="b">{v.academy_status ?? "—"}</span>{#if v.enrollment}<span class="b">Dossier : {v.enrollment.status}</span>{/if}
          <span class="b" class:sub={!!v.subscription.active}>{v.subscription.active ? `Abonné jusqu'au ${date(v.subscription.active.end)}` : "Sans abonnement"}</span></div></div>
      <div class="ts"><a class="btn btn-outline btn-sm" href={`/admin/prestataires/profils?id=${id}`}>Profil public</a>
        {#if canManage && !v.deleted}<Btn class="btn-outline btn-sm" loading={pending.is("active")} onclick={toggleActive}>{v.is_active ? "Désactiver" : "Activer"}</Btn>{/if}</div>
    </header>

    <div class="kp"><div><small>Réservations</small><strong>{v.stats.bookings}</strong></div><div><small>Terminées</small><strong>{v.stats.completed}</strong></div><div><small>En cours</small><strong>{v.stats.pending}</strong></div><div><small>Note</small><strong>{v.stats.rating ?? "—"}</strong><em>{v.stats.reviews} avis</em></div></div>

    <div class="tabs" role="tablist">
      {#each [["account", "Compte"], ["services", "Services"], ["subscription", "Abonnement"], ["danger", "Suppression"]] as [k, l]}
        <button role="tab" aria-selected={tab === k} class:active={tab === k} onclick={() => (tab = k as typeof tab)}>{l}</button>
      {/each}
    </div>

    {#if tab === "account"}
      <section class="box">
        <form class="fg" onsubmit={(e) => { e.preventDefault(); save(); }}>
          <label>Prénom(s)<input required minlength="2" maxlength="120" bind:value={form.firstname} disabled={!canManage} /></label>
          <label>Nom<input maxlength="120" bind:value={form.lastname} disabled={!canManage} /></label>
          <label>E-mail<input type="email" maxlength="255" bind:value={form.email} disabled={!canManage} /></label>
          <label>Sexe<select bind:value={form.sex} disabled={!canManage}><option value="">—</option><option value="male">Homme</option><option value="female">Femme</option></select></label>
          <label>Ville<input maxlength="120" bind:value={form.city} disabled={!canManage} /></label>
          <label>Code de parrainage<input maxlength="50" bind:value={form.referral_code} disabled={!canManage} /></label>
          <label class="full">Adresse<input maxlength="500" bind:value={form.address} disabled={!canManage} /></label>
          <label class="full">Présentation<textarea rows="3" maxlength="2000" bind:value={form.bio} disabled={!canManage}></textarea></label>
          <label>Statut Academy<select bind:value={form.academy_status} disabled={!canManage}><option value="provider">Prestataire</option><option value="certified_provider">Prestataire certifié</option><option value="apprentice">Apprenant</option></select></label>
          <label class="ck"><input type="checkbox" bind:checked={form.verified} disabled={!canManage} /> Prestataire vérifié (visible dans l'annuaire)</label>
          {#if canManage}<div class="full"><Btn type="submit" class="btn-primary" loading={pending.is("save")}>Enregistrer</Btn></div>{/if}
        </form>
        {#if v.enrollment?.admin_note}<p class="note">Note du dossier : {v.enrollment.admin_note}</p>{/if}
        <p class="hint">Le téléphone et les pièces du dossier se gèrent depuis « Formulaires d'enrôlement ».</p>
      </section>

    {:else if tab === "services"}
      <section class="box">
        <div class="bh"><h3>Services ({services.length})</h3>{#if canManage}<a class="btn btn-primary btn-sm" href={`/admin/prestataires/${id}/services/nouveau`}><Plus size={15} /> Ajouter un service</a>{/if}</div>
        {#if !svcLoaded}<p class="hint">Chargement…</p>
        {:else if services.length === 0}<p class="hint">Ce prestataire n'a aucun service.</p>
        {:else}
          <div class="tb">
            {#each services as s (s.id)}
              <div class="sr">
                <span class="sim">{#if s.image}<img src={s.image} alt="" loading="lazy" />{:else}{(s.subcategory.name ?? s.title).slice(0, 2)}{/if}</span>
                <div class="sm"><strong>{s.title}</strong><small>{s.subcategory.name ?? s.category} · {s.type === "online" ? "En ligne" : `${s.city ?? "—"} · ${s.districts.length} quartier(s)`}</small></div>
                <span>{fmt(s.min_price)} FCFA</span><span class="hint">{s.stats.bookings} résa</span>
                {#if canManage}
                  <label class="sw"><input type="checkbox" checked={s.is_active} onchange={() => toggleService(s)} /><span>{s.is_active ? "Visible" : "Masqué"}</span></label>
                  <span class="ac"><a class="ic" href={`/admin/prestataires/${id}/services/${s.id}`} aria-label="Modifier"><Pencil size={16} /></a><button class="ic dg" aria-label="Supprimer" onclick={() => removeService(s)}><Trash2 size={16} /></button></span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>

    {:else if tab === "subscription"}
      <section class="box">
        {#if v.subscription.active}<p class="okb">Abonnement actif jusqu'au <strong>{date(v.subscription.active.end)}</strong> ({v.subscription.active.period === "yearly" ? "annuel" : "mensuel"}, {fmt(v.subscription.active.amount)} FCFA).</p>
        {:else}<p class="warn">Aucun abonnement actif.</p>{/if}
        {#if canManage}
          <h3>Activer un abonnement <small>(paiement reçu en espèces ou via un agent)</small></h3>
          <div class="fg">
            <label>Formule<select bind:value={period}><option value="monthly">Mensuel — {fmt(v.subscription.pricing.monthly)} FCFA</option><option value="yearly">Annuel — {fmt(v.subscription.pricing.yearly)} FCFA</option></select></label>
            <label>Montant perçu (facultatif)<input type="number" min="0" placeholder="Tarif de la formule" bind:value={amount} /></label>
            <div class="full acts"><Btn class="btn-primary" loading={pending.is("sub")} onclick={activate}>{v.subscription.active ? "Prolonger" : "Activer"}</Btn>
              {#if v.subscription.active}<button class="btn btn-outline dg" onclick={deactivate}>Désactiver l'abonnement</button>{/if}</div>
          </div>
        {/if}
        <h3>Historique</h3>
        {#if v.subscription.history.length === 0}<p class="hint">Aucun abonnement enregistré.</p>
        {:else}<div class="tb">{#each v.subscription.history as h (h.id)}
          <div class="sr"><div class="sm"><strong>{h.period === "yearly" ? "Annuel" : "Mensuel"}</strong><small>{date(h.start)} → {date(h.end)}</small></div><span>{fmt(h.amount)} FCFA</span><span class="b" class:ok={h.status === "active" || h.status === "paid"} class:off={h.status === "pending"}>{SUB[h.status]}</span></div>
        {/each}</div>{/if}
      </section>

    {:else}
      <section class="box">
        {#if !preview}<p class="hint">Chargement…</p>
        {:else}
          <p>Ce compte contient <strong>{preview.bookings}</strong> réservation(s), <strong>{preview.services}</strong> service(s), <strong>{preview.reviews}</strong> avis et <strong>{preview.subscriptions}</strong> abonnement(s). Ces historiques sont conservés ; seules les données personnelles sont effacées.</p>
          {#if preview.blockers.length}
            <div class="warn"><strong>Suppression impossible pour le moment :</strong><ul>{#each preview.blockers as b}<li>{b.label}</li>{/each}</ul></div>
          {/if}
          {#if canManage}
            {#if v.deleted}
              <div class="acts"><Btn class="btn-primary" loading={pending.is("restore")} onclick={restore}>Restaurer le compte</Btn></div>
            {:else}
              <div class="acts"><button class="btn btn-outline dg" disabled={preview.blockers.length > 0} onclick={trash}>Mettre à la corbeille</button></div>
            {/if}
            <div class="danger">
              <h3>Anonymisation immédiate</h3>
              <p class="hint">Irréversible : nom, contacts, photo, pièces du dossier et profil public sont effacés tout de suite, sans attendre le délai de {preview.grace_days} jours.</p>
              <div class="acts"><input placeholder="Tapez ANONYMISER" bind:value={confirmText} /><Btn class="btn-primary dgb" loading={pending.is("anon")} disabled={confirmText !== "ANONYMISER" || preview.blockers.length > 0} onclick={anonymizeNow}>Anonymiser maintenant</Btn></div>
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; } .back { display: inline-flex; align-items: center; gap: 0.3rem; color: #2563eb; text-decoration: none; font-size: 0.85rem; width: fit-content; } .state { text-align: center; padding: 3rem; color: #9ca3af; }
  .top { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem 1.2rem; } .av { flex: none; width: 3.6rem; height: 3.6rem; border-radius: 50%; background: #e5e7eb; display: grid; place-items: center; font-weight: 800; font-size: 1.3rem; overflow: hidden; color: #4b5563; } .av img { width: 100%; height: 100%; object-fit: cover; }
  .id { flex: 1; min-width: 14rem; } .id h2 { margin: 0; display: flex; align-items: center; gap: 0.4rem; font-size: 1.3rem; } .id p { margin: 0.2rem 0 0.5rem; color: #6b7280; font-size: 0.85rem; overflow-wrap: anywhere; } :global(.vf) { color: #0f7d41; } .ts { display: flex; gap: 0.5rem; }
  .bs { display: flex; flex-wrap: wrap; gap: 0.35rem; } .b { display: inline-block; padding: 0.12rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: #f3f4f6; color: #4b5563; } .b.ok { background: #d1fae5; color: #065f46; } .b.off { background: #fef3c7; color: #92400e; } .b.del { background: #fee2e2; color: #991b1b; } .b.sub { background: #dbeafe; color: #1e40af; }
  .kp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.7rem; } .kp div { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0.7rem 1rem; display: flex; flex-direction: column; } .kp small, .kp em { color: #6b7280; font-size: 0.74rem; font-style: normal; } .kp strong { font-size: 1.4rem; }
  .tabs { display: flex; gap: 0.3rem; background: #f3f4f6; padding: 0.25rem; border-radius: 10px; width: fit-content; max-width: 100%; overflow-x: auto; } .tabs button { padding: 0.4rem 1rem; border: none; border-radius: 8px; background: none; color: #6b7280; font: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; } .tabs button.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06); }
  .box { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.2rem; display: flex; flex-direction: column; gap: 0.9rem; } .box h3 { margin: 0.3rem 0 0; font-size: 1rem; } .box h3 small { font-weight: 400; color: #9ca3af; font-size: 0.78rem; }
  .fg { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; } .fg label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: #374151; } .fg .full { grid-column: 1 / -1; } .fg .ck { flex-direction: row; align-items: center; gap: 0.5rem; align-self: end; }
  input:not([type="checkbox"]), select, textarea { padding: 0.55rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-weight: 400; background: #fff; } input:disabled, select:disabled, textarea:disabled { background: #f9fafb; }
  .hint { margin: 0; color: #6b7280; font-size: 0.82rem; } .note { margin: 0; padding: 0.6rem 0.8rem; background: #fef3c7; border-radius: 10px; color: #92400e; font-size: 0.85rem; } .okb { margin: 0; padding: 0.7rem 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; } .warn { margin: 0; padding: 0.7rem 1rem; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; } .warn ul { margin: 0.3rem 0 0; padding-left: 1.1rem; }
  .bh { display: flex; justify-content: space-between; align-items: center; } .bh h3 { margin: 0; } .tb { display: flex; flex-direction: column; } .sr { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 0; border-top: 1px solid #f1f2f4; flex-wrap: wrap; } .sr:first-child { border-top: none; }
  .sim { flex: none; width: 2.6rem; height: 2.6rem; border-radius: 10px; background: #e5e7eb; display: grid; place-items: center; font-weight: 800; text-transform: uppercase; color: #4b5563; overflow: hidden; } .sim img { width: 100%; height: 100%; object-fit: cover; } .sm { flex: 1; min-width: 12rem; display: flex; flex-direction: column; } .sm small { color: #6b7280; }
  .sw { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; } .ac { display: inline-flex; gap: 0.2rem; } .ic { display: inline-flex; padding: 0.4rem; border: none; background: none; border-radius: 8px; color: #6b7280; cursor: pointer; } .ic:hover { background: #f3f4f6; } .ic.dg:hover { background: #fee2e2; color: #b91c1c; }
  .acts { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; } .dg { border-color: #dc2626 !important; color: #b91c1c !important; } :global(.dgb) { background: #dc2626 !important; border-color: #dc2626 !important; } .danger { border-top: 1px solid #fecaca; padding-top: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; }
  @media (max-width: 760px) { .kp { grid-template-columns: 1fr 1fr; } .fg { grid-template-columns: 1fr; } }
</style>
