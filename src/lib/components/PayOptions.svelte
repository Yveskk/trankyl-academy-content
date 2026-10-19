<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import type { PayMode } from "$lib/api/bookings";
  import { i18n } from "$lib/stores/locale.svelte";

  // Choix de ce que le client regle en ligne : tout, mise en relation seule ou service seul.
  // `options` ne contient que les parts encore dues (une part deja payee n'est plus proposee).
  let {
    options,
    value = $bindable<PayMode>("ALL"),
    name = "pay-mode",
  }: { options: { mode: PayMode; amount: number }[]; value: PayMode; name?: string } = $props();

  const en = $derived(i18n.locale === "en");
  const t = (fr: string, e: string) => (en ? e : fr);
  const fmt = (v: number) => v.toLocaleString(en ? "en-US" : "fr-FR").replace(/ | /g, " ");

  const COPY = $derived({
    ALL: { title: t("Tout payer maintenant", "Pay everything now"), text: t("Service + frais de mise en relation, en une seule fois.", "Service + connection fee, in one go.") },
    PL: { title: t("Mise en relation uniquement", "Connection fee only"), text: t("Les frais Trankyl maintenant ; le service se règle ensuite.", "Trankyl's fee now; the service is paid afterwards.") },
    BK: { title: t("Service uniquement", "Service only"), text: t("Le service maintenant ; les frais de mise en relation se règlent séparément.", "The service now; the connection fee is paid separately.") },
  } as Record<PayMode, { title: string; text: string }>);

  // Une seule part restante : on le dit clairement plutot que de proposer un « choix ».
  const single = $derived(options.length === 1);

  $effect(() => {
    if (options.length && !options.some((o) => o.mode === value)) value = options[0].mode;
  });
</script>

<div class="po" role="radiogroup" aria-label={t("Que souhaitez-vous payer ?", "What would you like to pay?")}>
  {#each options as o (o.mode)}
    <label class="opt" class:on={value === o.mode}>
      <input type="radio" {name} value={o.mode} bind:group={value} />
      <span class="dot">{#if value === o.mode}<Check size={12} />{/if}</span>
      <span class="txt">
        <strong>{single ? t("Régler le solde", "Pay the balance") : COPY[o.mode].title}</strong>
        <small>{COPY[o.mode].text}</small>
      </span>
      <span class="amt">{fmt(o.amount)} <small>FCFA</small></span>
    </label>
  {/each}
</div>

<style>
  .po {
    display: grid;
    gap: 0.55rem;
  }
  .opt {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.8rem 0.95rem;
    border: 1.5px solid var(--border, #e4dcc0);
    border-radius: 14px;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .opt:hover {
    border-color: #c9bd8c;
  }
  .opt.on {
    border-color: var(--green, #0f7d41);
    background: #f1faf3;
    box-shadow: 0 0 0 3px rgba(15, 125, 65, 0.12);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .dot {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #c8cdc9;
    color: #fff;
    background: #fff;
  }
  .opt.on .dot {
    background: var(--green, #0f7d41);
    border-color: var(--green, #0f7d41);
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }
  .txt strong {
    font-size: 0.92rem;
  }
  .txt small {
    font-size: 0.76rem;
    color: #6b7280;
    line-height: 1.35;
  }
  .amt {
    font-weight: 800;
    font-size: 0.98rem;
    white-space: nowrap;
  }
  .amt small {
    font-size: 0.7rem;
    font-weight: 700;
    color: #6b7280;
  }
</style>
