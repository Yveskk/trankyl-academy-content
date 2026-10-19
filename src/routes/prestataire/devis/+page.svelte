<script lang="ts">
  import "$lib/components/provider/work.css";
  import { onMount } from "svelte";
  import Mail from "@lucide/svelte/icons/mail";
  import Phone from "@lucide/svelte/icons/phone";
  import { getPayments, listQuotes, replyQuote, type WorkQuote, type WorkRequest } from "$lib/api/providerSpace";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  let quotes = $state<WorkQuote[]>([]);
  let invoices = $state<WorkRequest[]>([]);
  let loading = $state(true);
  let sel = $state<WorkQuote | null>(null);
  let subject = $state("");
  let message = $state("");
  let sending = $state(false);

  onMount(async () => {
    try {
      const [q, p] = await Promise.all([listQuotes(), getPayments()]);
      quotes = q;
      invoices = p.items.filter((i) => i.status === "completed");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  });
  const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
  function open(q: WorkQuote) {
    sel = q;
    subject = q.reply_subject ?? "Votre demande de devis";
    message = q.reply_message ?? "";
  }
  async function send(event: SubmitEvent) {
    event.preventDefault();
    if (!sel) return;
    sending = true;
    try {
      const u = await replyQuote(sel.id, subject.trim(), message.trim());
      quotes = quotes.map((x) => (x.id === u.id ? u : x));
      snackbar.success("Réponse envoyée au client par e-mail.");
      sel = null;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      sending = false;
    }
  }
</script>

<div class="pw">
  <div><h1>Devis et factures</h1><p class="pw-sub">Répondez aux demandes de devis de vos clients et retrouvez vos missions facturées.</p></div>
  {#if loading}<div class="pw-empty">Chargement…</div>{:else}
    <div class="pw-grid2">
      <section class="pw-box">
        <h2>Demandes de devis ({quotes.length})</h2>
        {#if quotes.length === 0}<p class="pw-muted">Aucune demande de devis pour l'instant.</p>{/if}
        <div class="pw-list">
          {#each quotes as q (q.id)}
            <button class="pw-row" style="grid-template-columns:1fr auto" onclick={() => open(q)}>
              <div><strong>{q.name}</strong><span class="pw-sm">{q.message.slice(0, 90)}{q.message.length > 90 ? "…" : ""}</span><span class="pw-sm">{date(q.created_at)}</span></div>
              <div class="end"><span class="pw-badge {q.status}">{q.status === "answered" ? "Répondu" : "Nouveau"}</span></div>
            </button>
          {/each}
        </div>
      </section>
      <section class="pw-box">
        <h2>Missions facturées ({invoices.length})</h2>
        {#if invoices.length === 0}<p class="pw-muted">Vos missions terminées apparaîtront ici.</p>{/if}
        <div class="pw-list">
          {#each invoices as i (i.id)}
            <div class="pw-row" style="grid-template-columns:1fr auto;cursor:default"><div><span class="pw-ref">{i.ref}</span><strong>{i.service ?? "Service"}</strong><span class="pw-sm">{i.client_name ?? "Client"} · {date(i.date)}</span></div><div class="end"><strong>{money(i.total)}</strong><span class="pw-badge {i.paid ? 'completed' : 'pending'}">{i.paid ? "Payée" : "À recevoir"}</span></div></div>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</div>

<Modal open={sel !== null} title="Demande de devis" subtitle={sel ? `${sel.name} · ${date(sel.created_at)}` : ""} width="36rem" locked={sending} onclose={() => (sel = null)}>
  {#if sel}
    <form id="qf" class="pw" onsubmit={send} novalidate>
      <dl><dt>Message</dt><dd>{sel.message}</dd>{#if sel.slot_label}<dt>Créneau souhaité</dt><dd>{sel.slot_label}</dd>{/if}<dt>Contact</dt><dd><a href={`mailto:${sel.email}`}><Mail size={12} /> {sel.email}</a><br /><a href={`tel:${sel.phone}`}><Phone size={12} /> {sel.phone}</a></dd></dl>
      <div class="field"><label for="qs">Objet</label><input id="qs" bind:value={subject} maxlength="200" /></div>
      <div class="field"><label for="qm">Votre réponse (envoyée par e-mail au client)</label><textarea id="qm" rows="6" maxlength="5000" bind:value={message} placeholder="Votre prix, les délais, ce qui est inclus…"></textarea></div>
    </form>
  {/if}
  {#snippet footer()}<Btn class="btn-outline" onclick={() => (sel = null)} disabled={sending}>Fermer</Btn><Btn type="submit" form="qf" class="btn-primary" loading={sending} disabled={subject.trim().length < 3 || message.trim().length < 3}>{sel?.status === "answered" ? "Renvoyer la réponse" : "Envoyer la réponse"}</Btn>{/snippet}
</Modal>
