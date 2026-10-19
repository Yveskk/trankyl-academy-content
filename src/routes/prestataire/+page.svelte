<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Plus from "@lucide/svelte/icons/plus";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Check from "@lucide/svelte/icons/check";
  import Clock from "@lucide/svelte/icons/clock";
  import CreditCard from "@lucide/svelte/icons/credit-card";
  import Circle from "@lucide/svelte/icons/circle";
  import Shield from "@lucide/svelte/icons/shield";
  import { getDashboard, type Dashboard } from "$lib/api/providerSpace";
  import { providerSpace } from "$lib/stores/providerSpace.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let d = $state<Dashboard | null>(null);
  let loading = $state(true);

  onMount(async () => {
    const st = await providerSpace.load(true).catch(() => null);
    if (!st) return;
    if (!st.dashboard_unlocked) {
      await goto(st.next_step === "enrollment" ? "/prestataire/enrolement" : "/prestataire/profil", { replaceState: true });
      return;
    }
    try {
      d = await getDashboard();
      providerSpace.newRequests = d.new_requests;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
  const STATUS = { pending: "En attente", completed: "Terminée", cancelled: "Annulée" } as const;
  async function share() {
    if (!d) return;
    const url = `${location.origin}/profil/${d.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${d.name} sur Trankyl`, url });
      else {
        await navigator.clipboard.writeText(url);
        snackbar.success("Lien de votre profil copié.");
      }
    } catch {
      /* partage annulé */
    }
  }
</script>

{#if loading}
  <div class="load"><span></span></div>
{:else if d}
  <div class="dash">
    <header class="top">
      <div>
        <h1>Bonjour {d.name}</h1>
        <p>{d.new_requests} demande{d.new_requests > 1 ? "s" : ""} en attente{d.city ? ` · ${d.city}` : ""}</p>
      </div>
      <div class="acts">
        <a class="ghost" href="/prestataire/devis"><Plus size={16} /> Devis et factures</a>
        <button type="button" class="gold" onclick={share}><Share2 size={16} /> Partager mon profil</button>
      </div>
    </header>

    {#if d.subscription && (!d.subscription.active || d.subscription.days_left <= 7)}
      {@const sub = d.subscription}
      <div class="note sub" class:urgent={!sub.active}>
        <CreditCard size={18} />
        <span>
          {#if !sub.active && !sub.ever}<strong>Vous n'avez pas encore d'abonnement.</strong> Abonnez-vous pour que votre profil reste visible et pour recevoir des demandes de clients.
          {:else if !sub.active}<strong>Votre abonnement a expiré.</strong> Renouvelez-le pour remettre votre profil en visibilité.
          {:else}<strong>Votre abonnement expire {sub.days_left === 0 ? "aujourd'hui" : `dans ${sub.days_left} jour${sub.days_left > 1 ? "s" : ""}`}.</strong> Renouvelez-le pour ne pas perdre votre visibilité.{/if}
        </span>
        <a class="cta" href="/prestataire/abonnement">{sub.ever ? "Renouveler" : "Je m'abonne"}</a>
      </div>
    {/if}

    {#if d.enrollment_status === "pending"}
      <div class="note"><Clock size={16} /> Votre dossier d'enrôlement est en cours d'examen par notre équipe. Vous serez prévenu par e-mail.</div>
    {:else if d.enrollment_note}
      <div class="note"><Shield size={16} /> Message de l'équipe : {d.enrollment_note}</div>
    {/if}

    <section class="box">
      <div class="row between">
        <h2>Vérification et badges</h2>
        <span class="muted">{d.verification.done} étape{d.verification.done > 1 ? "s" : ""} sur {d.verification.total} · profil vérifié à {d.verification.percent} %</span>
      </div>
      <div class="meter"><span style:width="{d.verification.percent}%"></span></div>
      <div class="chips">
        {#each d.verification.steps as s (s.key)}
          <div class="chip {s.status}">
            <b>{#if s.status === "validated"}<Check size={13} /> Validé{:else if s.status === "review"}<Clock size={13} /> En vérification{:else}<Circle size={11} /> À faire{/if}</b>
            <span>{s.label}</span>
          </div>
        {/each}
      </div>
    </section>

    <div class="kpis">
      <div class="kpi"><small>Revenus du mois</small><strong>{money(d.stats.revenue_month)}</strong><span>réservations terminées</span></div>
      <div class="kpi"><small>Vues du profil</small><strong>{d.stats.profile_views ?? "—"}</strong><span>bientôt disponible</span></div>
      <div class="kpi"><small>Taux d'acceptation des devis</small><strong>{d.stats.acceptance_rate !== null ? `${d.stats.acceptance_rate} %` : "—"}</strong><span>bientôt disponible</span></div>
      <div class="kpi"><small>Clients fidèles</small><strong>{d.stats.loyal_clients}</strong><span>ont réservé 2 fois ou plus</span></div>
    </div>

    <div class="cols">
      <section class="box">
        <div class="row between"><h2>Devis et factures</h2><a class="soonlink" href="/prestataire/devis">Tout voir</a></div>
        {#if d.recent.length === 0}
          <p class="muted empty">Aucune réservation pour l'instant. Elles apparaîtront ici dès votre première demande.</p>
        {:else}
          <div class="tw">
            <table>
              <thead><tr><th>N°</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {#each d.recent as r (r.id)}
                  <tr><td>{r.ref}</td><td>{r.client ?? "—"}</td><td><b>{money(r.amount)}</b></td><td><span class="pill {r.status}">{STATUS[r.status]}</span></td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
      <aside class="coach">
        <div class="ch"><span>S</span><strong>Coach SITA Pro</strong></div>
        <p>Ajoutez des photos avant/après : les profils avec photos reçoivent nettement plus de demandes.</p>
        <p>Répondez vite aux demandes : un premier message rapide augmente vos chances d'être choisi.</p>
        <p>Gardez votre agenda à jour pour ne proposer que des créneaux où vous êtes libre.</p>
        <div class="ask">Demandez : « comment répondre à un client mécontent ? »<em>bientôt</em></div>
      </aside>
    </div>

    <div class="trio">
      <section class="box"><h2>Ma protection</h2><p class="muted">Assurance accident et responsabilité civile pour les prestataires actifs.</p><ul><li>✓ Responsabilité civile en mission</li><li>✓ Accident du travail</li></ul><span class="tag">Bientôt</span></section>
      <section class="box gold"><h2>Trankyl Pro</h2><p>Mise en avant dans les résultats, devis illimités, statistiques détaillées, page vitrine personnalisée.</p><span class="tag dark">Bientôt</span></section>
      <section class="box"><h2>Équipement</h2><p class="muted">Kits outils et pièces à prix négociés, payables en plusieurs fois sur vos prochains revenus Trankyl.</p><span class="tag">Bientôt</span></section>
    </div>
  </div>
{/if}

<style>
  .load { display: grid; place-items: center; min-height: 40vh; }
  .load span { width: 2rem; height: 2rem; border-radius: 50%; border: 3px solid #d6d9df; border-top-color: #2b303a; animation: r 0.8s linear infinite; }
  @keyframes r { to { transform: rotate(360deg); } }
  .dash { display: flex; flex-direction: column; gap: 1rem; width: 100%; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
  .top h1 { margin: 0; font-size: 1.9rem; color: #1d2230; }
  .top p { margin: 0.2rem 0 0; color: #6b7280; font-size: 0.9rem; }
  .acts { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .acts button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.1rem; border-radius: 12px; font: inherit; font-weight: 800; font-size: 0.88rem; cursor: pointer; border: 1.5px solid #1d2230; background: #fff; color: #1d2230; }
  .acts a.ghost { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.1rem; border-radius: 12px; font-weight: 800; font-size: 0.88rem; border: 1.5px solid #1d2230; background: #fff; color: #1d2230; text-decoration: none; }
  .acts .gold { background: #ffc72c; border-color: #ffc72c; }
  .acts button:disabled { opacity: 0.55; cursor: not-allowed; }
  .note.sub { background: #eef0f3; border-color: #cfd3d9; color: #1f2937; }
  .note.sub.urgent { background: #fff1f0; border-color: #f5c2bd; color: #7f1d1d; }
  .note.sub span { flex: 1; }
  .note.sub .cta { background: #ffc72c; color: #1f2937; text-decoration: none; font-weight: 800; font-size: 0.82rem; padding: 0.45rem 1rem; border-radius: 999px; white-space: nowrap; }
  .note { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 12px; background: #fff7dc; border: 1px solid #f1d98a; color: #6b4e00; font-size: 0.88rem; }
  .box { background: #fff; border-radius: 16px; padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.8rem; position: relative; }
  .box h2 { margin: 0; font-size: 1.1rem; color: #1d2230; }
  .box p { margin: 0; font-size: 0.88rem; }
  .box ul { margin: 0; padding: 0; list-style: none; font-size: 0.85rem; color: #374151; display: flex; flex-direction: column; gap: 0.25rem; }
  .row { display: flex; align-items: center; gap: 0.8rem; }
  .between { justify-content: space-between; flex-wrap: wrap; }
  .muted { color: #6b7280; font-size: 0.85rem; }
  .meter { height: 8px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
  .meter span { display: block; height: 100%; background: #ffc72c; border-radius: 99px; transition: width 0.5s; }
  .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: 0.6rem; }
  .chip { border: 1px solid #e3e5ea; border-radius: 12px; padding: 0.55rem 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .chip b { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.74rem; }
  .chip span { font-size: 0.86rem; color: #1d2230; }
  .chip.validated b { color: #1c8f4a; }
  .chip.review b { color: #b7791f; }
  .chip.todo b { color: #6b7280; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; }
  .kpi { background: #fff; border-radius: 16px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .kpi small { color: #6b7280; font-size: 0.78rem; }
  .kpi strong { font-size: 1.6rem; color: #1d2230; }
  .kpi span { font-size: 0.76rem; color: #6b7280; }
  .cols { display: grid; grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr); gap: 0.8rem; align-items: start; }
  .soonlink { font-size: 0.82rem; font-weight: 800; color: #1d2230; text-decoration: underline; }
  .tw { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
  th { text-align: left; font-weight: 600; color: #6b7280; padding: 0.4rem 0.5rem; border-bottom: 1px solid #e5e7eb; font-size: 0.78rem; }
  td { padding: 0.65rem 0.5rem; border-bottom: 1px solid #f0f1f3; }
  .pill { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 99px; font-size: 0.74rem; font-weight: 700; }
  .pill.completed { background: #d7f3df; color: #1c6b3b; }
  .pill.pending { background: #fdeeb9; color: #8a5b00; }
  .pill.cancelled { background: #fbdcdc; color: #9b1c1c; }
  .empty { padding: 1rem 0; }
  .coach { background: linear-gradient(180deg, var(--brand-gray-soft), var(--brand-gray)); color: var(--brand-gray-ink); border-radius: 16px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .ch { display: flex; align-items: center; gap: 0.6rem; }
  .ch span { width: 1.8rem; height: 1.8rem; border-radius: 8px; background: #ffc72c; color: #1d2230; display: grid; place-items: center; font-weight: 800; }
  .coach p { margin: 0; color: var(--brand-gray-ink); background: rgba(255, 255, 255, 0.65); border-radius: 10px; padding: 0.6rem 0.75rem; font-size: 0.84rem; line-height: 1.4; }
  .ask { background: #fff; color: #6b7280; border-radius: 10px; padding: 0.6rem 0.75rem; font-size: 0.82rem; display: flex; justify-content: space-between; gap: 0.5rem; }
  .ask em { font-style: normal; font-size: 0.7rem; font-weight: 800; color: #9aa0ad; }
  .trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
  .box.gold { background: #ffc72c; }
  .box.gold p { color: #3a2e00; }
  .tag { position: absolute; top: 0.9rem; right: 0.9rem; font-size: 0.68rem; font-weight: 800; background: #eef0f3; color: #6b7280; padding: 0.15rem 0.5rem; border-radius: 99px; }
  .tag.dark { background: var(--brand-gray); color: var(--brand-gray-ink); }
  @media (max-width: 1000px) { .kpis { grid-template-columns: repeat(2, 1fr); } .cols, .trio { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 520px) { .kpis { grid-template-columns: 1fr; } }
</style>
