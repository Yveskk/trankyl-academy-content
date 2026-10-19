<script lang="ts">
  import { onMount } from "svelte";
  import Btn from "$lib/components/Btn.svelte";
  import { getSubscriptionPricing, saveSubscriptionPricing } from "$lib/api/adminResources";
  import { auth } from "$lib/stores/auth.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Crown from "@lucide/svelte/icons/crown";

  let monthly = $state<number | "">("");
  let yearly = $state<number | "">("");
  let configured = $state(true);
  let loading = $state(true);
  let saving = $state(false);
  let canManage = $derived(auth.can("academy.subscription.manage"));

  onMount(async () => {
    try {
      const p = await getSubscriptionPricing();
      monthly = p.monthly_amount;
      yearly = p.yearly_amount;
      configured = p.configured;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });

  const fmt = (v: number | "") => (v === "" ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`);
  // Economie annuelle par rapport a 12 mensualites.
  const saving12 = $derived(monthly !== "" && yearly !== "" && Number(monthly) * 12 > Number(yearly) ? Number(monthly) * 12 - Number(yearly) : 0);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (monthly === "" || yearly === "") return;
    saving = true;
    try {
      const p = await saveSubscriptionPricing({ monthly_amount: Number(monthly), yearly_amount: Number(yearly) });
      configured = p.configured;
      snackbar.success("Tarifs enregistrés.");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      saving = false;
    }
  }
</script>

<div class="page">
  <p class="desc">Tarifs de l'abonnement des prestataires. Ils sont partagés avec les applications Trankyl : le montant saisi ici est celui proposé au paiement de l'abonnement.</p>

  <div class="grid">
    <form class="card" onsubmit={save}>
      <h3><Crown size={18} /> Tarifs de l'abonnement</h3>
      {#if !configured && !loading}<p class="note">Aucun tarif enregistré pour l'instant : les valeurs par défaut (500 et 10 000 FCFA) sont affichées.</p>{/if}
      <label>Abonnement mensuel (FCFA)
        <input type="number" min="0" step="1" bind:value={monthly} required disabled={loading || !canManage} />
      </label>
      <label>Abonnement annuel (FCFA)
        <input type="number" min="0" step="1" bind:value={yearly} required disabled={loading || !canManage} />
      </label>
      {#if canManage}<div class="actions"><Btn type="submit" class="btn-primary" loading={saving} disabled={loading}>Enregistrer</Btn></div>{/if}
    </form>

    <aside class="card preview">
      <h3>Aperçu</h3>
      <div class="plan"><small>Mensuel</small><strong>{fmt(monthly)}</strong><span>par mois</span></div>
      <div class="plan"><small>Annuel</small><strong>{fmt(yearly)}</strong><span>par an{#if saving12 > 0} · {fmt(saving12)} d'économie{/if}</span></div>
    </aside>
  </div>
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; max-width: 52rem; }
  .grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .card { display: flex; flex-direction: column; gap: 0.9rem; padding: 1.3rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
  h3 { margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.82rem; font-weight: 700; color: #374151; }
  input { padding: 0.65rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-size: 0.95rem; }
  input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .note { margin: 0; padding: 0.6rem 0.8rem; border-radius: 10px; background: #fef3c7; color: #92400e; font-size: 0.82rem; }
  .actions { display: flex; justify-content: flex-end; }
  .preview { background: #f9fafb; }
  .plan { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.9rem 1rem; border-radius: 12px; background: #fff; border: 1px solid #e5e7eb; }
  .plan small { color: #6b7280; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.06em; }
  .plan strong { font-size: 1.4rem; }
  .plan span { color: #6b7280; font-size: 0.8rem; }
  @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
</style>
