<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Check from "@lucide/svelte/icons/check";
  import Btn from "$lib/components/Btn.svelte";
  import { getSubscription, startSubscription, type SubscriptionState } from "$lib/api/providerAccount";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let s = $state<SubscriptionState | null>(null);
  let loading = $state(true);
  let busy = $state<"monthly" | "yearly" | null>(null);

  async function load() {
    try {
      s = await getSubscription();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    load();
    if ($page.url.searchParams.get("paiement")) snackbar.success("Merci ! Votre abonnement s'activera dès confirmation du paiement.");
  });

  async function pay(period: "monthly" | "yearly") {
    busy = period;
    try {
      const r = await startSubscription(period);
      location.href = r.pay_url; // page de paiement sécurisée ; l'activation vient de la confirmation du paiement
    } catch (e) {
      snackbar.error((e as Error).message);
      busy = null;
    }
  }
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");
  const LABEL = { active: "Actif", expired: "Expiré", paid: "Payé", pending: "En attente de paiement" } as const;
  const BADGE = { active: "completed", paid: "completed", expired: "cancelled", pending: "pending" } as const;
  const PERIOD = { monthly: "Mensuel", yearly: "Annuel" } as const;
  const FEATURES = ["Profil visible dans l'annuaire et la recherche", "Réservations et demandes de devis illimitées", "Badge prestataire vérifié", "Paiement sécurisé et suivi des revenus"];
  const saving = $derived(s ? Math.max(0, s.pricing.monthly * 12 - s.pricing.yearly) : 0);
</script>

<div class="pw">
  <div class="pw-top"><div><h1>Abonnement PRO</h1><p class="pw-sub">Gardez votre profil actif et visible auprès des clients.</p></div></div>
  {#if loading}<div class="pw-empty">Chargement…</div>
  {:else if s}
    {#if s.current}
      <section class="pw-box current">
        <div><span class="pw-badge completed">Abonnement actif</span><h2>{PERIOD[s.current.period]} · {fmt(s.current.amount)} {s.currency}</h2>
          <p class="pw-muted">Du {date(s.current.start)} au <strong>{date(s.current.end)}</strong> — il reste {s.days_left} jour(s).</p></div>
        {#if s.days_left <= 7}<span class="pw-badge pending">Pensez à renouveler</span>{/if}
      </section>
    {:else}
      <section class="pw-box warn"><strong>Aucun abonnement actif.</strong><p class="pw-muted">Choisissez une formule pour réactiver votre visibilité.</p></section>
    {/if}

    <div class="plans">
      {#each [["monthly", "Mensuel", s.pricing.monthly, "par mois"], ["yearly", "Annuel", s.pricing.yearly, "par an"]] as [key, label, price, per] (key)}
        <article class="plan" class:best={key === "yearly"}>
          {#if key === "yearly" && saving > 0}<em>Économisez {fmt(saving)} {s.currency}</em>{/if}
          <h3>{label}</h3>
          <p class="amt"><strong>{fmt(Number(price))}</strong> {s.currency} <small>{per}</small></p>
          <ul>{#each FEATURES as f}<li><Check size={15} />{f}</li>{/each}</ul>
          <Btn class="btn-primary" loading={busy === key} disabled={!s.online_payment || busy !== null} onclick={() => pay(key as "monthly" | "yearly")}>{s.current ? "Renouveler" : "S'abonner"} — {String(label).toLowerCase()}</Btn>
        </article>
      {/each}
    </div>
    {#if !s.online_payment}<p class="pw-muted">Le paiement en ligne est momentanément indisponible. Pour payer en espèces ou via un agent, <a href="/prestataire/parametres">contactez le support</a>.</p>
    {:else}<p class="pw-muted">Paiement sécurisé par Mobile Money ou carte. Pour payer en espèces ou via un agent, <a href="/prestataire/parametres">contactez le support</a>.</p>{/if}

    <section class="pw-box">
      <h2>Historique</h2>
      {#if s.history.length === 0}<p class="pw-muted">Aucun abonnement pour le moment.</p>
      {:else}
        <div class="tbl">
          {#each s.history as h (h.id)}
            <div class="r">
              <span><strong>{PERIOD[h.period]}</strong><small>{date(h.start)} → {date(h.end)}</small></span>
              <span>{fmt(h.amount)} {s.currency}</span>
              <span class="pw-badge {BADGE[h.status]}">{LABEL[h.status]}</span>
              <span class="end">{#if h.pay_url}<a class="btn btn-outline btn-sm" href={h.pay_url}>Payer</a>{:else if h.paid_at}<small>Payé le {date(h.paid_at)}</small>{/if}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
    <section class="pw-box">
      <div class="ph"><h2>Paiements d'abonnement</h2>{#if s.paid_total}<span class="pw-sm">Total payé : <strong>{fmt(s.paid_total)} {s.currency}</strong></span>{/if}</div>
      {#if s.payments.length === 0}<p class="pw-muted">Aucun paiement enregistré. Un paiement apparaît ici dès que Trankyl en reçoit la confirmation.</p>
      {:else}
        <div class="tbl">
          {#each s.payments as p (p.reference ?? p.date)}
            <div class="r pay">
              <span><strong>{fmt(p.amount)} {s.currency}</strong><small>{date(p.date)}</small></span>
              <span><strong>Abonnement {PERIOD[p.period].toLowerCase()}</strong><small>{date(p.covers_from)} → {date(p.covers_to)}</small></span>
              <span><small>Référence</small><code>{p.reference ?? p.invoice ?? "—"}</code></span>
              <span class="end">{#if p.invoice_url}<a class="btn btn-outline btn-sm" href={p.invoice_url} target="_blank" rel="noopener">Voir la facture</a>{/if}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .ph { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; } .ph h2 { margin: 0; }
  .r.pay { grid-template-columns: 1fr 1.4fr 1.3fr auto; } code { font-size: 0.78rem; color: #374151; overflow-wrap: anywhere; }
  .current { flex-direction: row; justify-content: space-between; align-items: center; border: 1px solid #bfe3cb; background: #f3fbf6; } .current h2 { margin: 0.4rem 0 0.2rem; } .current p { margin: 0; }
  .warn { background: #fff8e6; border: 1px solid #fde4a1; } .warn p { margin: 0; }
  .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 1rem; }
  .plan { position: relative; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 1.4rem; display: flex; flex-direction: column; gap: 0.7rem; } .plan.best { border: 2px solid #0f7d41; }
  .plan em { position: absolute; top: -0.7rem; right: 1rem; background: #0f7d41; color: #fff; font-style: normal; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.7rem; border-radius: 999px; }
  .plan h3 { margin: 0; } .amt { margin: 0; } .amt strong { font-size: 2rem; } .amt small { color: #6b7280; }
  .plan ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; flex: 1; } .plan li { display: flex; gap: 0.5rem; align-items: center; font-size: 0.86rem; color: #374151; } .plan li :global(svg) { color: #0f7d41; flex: none; }
  .tbl { display: flex; flex-direction: column; } .r { display: grid; grid-template-columns: 1.6fr 1fr 1.2fr auto; gap: 1rem; align-items: center; padding: 0.7rem 0; border-top: 1px solid #f1f2f5; } .r:first-child { border-top: none; }
  .r span { display: flex; flex-direction: column; gap: 0.1rem; } .r small { color: #6b7280; } .end { align-items: flex-end; }
  @media (max-width: 720px) { .r, .r.pay { grid-template-columns: 1fr 1fr; } .current { flex-direction: column; align-items: flex-start; gap: 0.6rem; } }
</style>
