<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Check from "@lucide/svelte/icons/check";
  import FileText from "@lucide/svelte/icons/file-text";
  import PenLine from "@lucide/svelte/icons/pen-line";
  import Phone from "@lucide/svelte/icons/phone";
  import Mail from "@lucide/svelte/icons/mail";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { decideForm, decideSignature, getForm, type FormDetail } from "$lib/api/enrollmentForms";
  import Btn from "$lib/components/Btn.svelte";
  import ImageLightbox from "$lib/components/ImageLightbox.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";

  const pending = new Pending();
  const id = Number($page.params.id);
  const STATUS = { pending: "En attente", approved: "Approuvé", rejected: "Refusé" } as const;

  let d = $state<FormDetail | null>(null);
  let loading = $state(true);
  let checked = $state<Record<string, boolean>>({});
  let note = $state("");
  let rejecting = $state(false);
  let zoom = $state(false);
  let zoomSrc = $state("");
  const canManage = $derived(auth.can("academy.enrollment_forms.manage"));

  async function load() {
    try {
      d = await getForm(id);
      const c: Record<string, boolean> = {};
      for (const g of d.groups) for (const f of g.fields) c[f.key] = f.filled || !!f.optional;
      checked = c;
      note = d.admin_note ?? "";
    } catch (e) {
      snackbar.error((e as Error).message);
      await goto("/admin/enrolements");
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const all = $derived(d ? d.groups.flatMap((g) => g.fields) : []);
  const uncheckedLabels = $derived(all.filter((f) => !checked[f.key]).map((f) => f.label));
  const checkedCount = $derived(all.filter((f) => checked[f.key]).length);
  const isImg = (u: string) => !/\.pdf($|\?)/i.test(u);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  function setGroup(gi: number, v: boolean) {
    for (const f of d!.groups[gi].fields) checked[f.key] = v;
  }
  function view(u: string) {
    if (isImg(u)) {
      zoomSrc = u;
      zoom = true;
    } else window.open(u, "_blank", "noopener,noreferrer");
  }

  async function approve() {
    if (!d) return;
    const ok = await confirmDialog.ask({
      title: "Approuver ce dossier ?",
      message: uncheckedLabels.length
        ? `${uncheckedLabels.length} élément(s) non validé(s) : ${uncheckedLabels.join(", ")}. Le prestataire sera informé de ce qu'il doit compléter. Il sera aussi marqué « vérifié ».`
        : "Toutes les informations sont validées. Le prestataire sera prévenu par e-mail et marqué « vérifié ».",
      confirmLabel: "Approuver",
      action: () => decideForm(id, "approved", note.trim(), uncheckedLabels),
    });
    if (ok) {
      snackbar.success("Dossier approuvé.");
      await goto("/admin/enrolements");
    }
  }
  async function reject() {
    if (!note.trim()) return void snackbar.error("Indiquez le motif du refus : le prestataire le recevra.");
    await pending.run("reject", async () => {
      try {
        await decideForm(id, "rejected", note.trim(), uncheckedLabels);
        rejecting = false;
        snackbar.success("Dossier refusé. Le prestataire a été prévenu.");
        await goto("/admin/enrolements");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
  async function signature(approve: boolean) {
    await pending.run("sig", async () => {
      try {
        await decideSignature(id, approve);
        snackbar.success(approve ? "Nouvelle signature approuvée." : "Nouvelle signature refusée.");
        await load();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }
</script>

<ImageLightbox src={zoomSrc} alt="Pièce du dossier" bind:open={zoom} />

{#if loading}
  <div class="state">Chargement…</div>
{:else if d}
  <div class="pg">
    <header class="head">
      <span class="av">{#if d.vendor.image}<img src={d.vendor.image} alt="" />{:else}{d.vendor.name[0] ?? "?"}{/if}</span>
      <div class="who">
        <h2>{d.vendor.name || "Prestataire"} <span class="badge {d.status}">{STATUS[d.status]}</span></h2>
        <p>
          {#if d.vendor.phone}<span><Phone size={13} /> {d.vendor.phone}</span>{/if}
          {#if d.vendor.email}<span><Mail size={13} /> {d.vendor.email}</span>{/if}
          {#if d.vendor.city || d.vendor.address}<span><MapPin size={13} /> {[d.vendor.address, d.vendor.city].filter(Boolean).join(", ")}</span>{/if}
        </p>
        <small>Soumis le {when(d.created_at)} · mis à jour le {when(d.updated_at)}</small>
      </div>
      <div class="count"><strong>{checkedCount}/{all.length}</strong><span>éléments validés</span></div>
    </header>

    {#if d.signature_pending}
      <div class="sigcard">
        <div><strong><PenLine size={15} /> Nouvelle signature en attente</strong>{#if d.signature_reason}<p>Motif : {d.signature_reason}</p>{/if}<img src={d.signature_pending} alt="Nouvelle signature" /></div>
        {#if canManage}<div class="acts"><Btn class="btn-primary btn-sm" loading={pending.is("sig")} onclick={() => signature(true)}>Approuver</Btn><Btn class="btn-outline btn-danger btn-sm" disabled={pending.is("sig")} onclick={() => signature(false)}>Refuser</Btn></div>{/if}
      </div>
    {/if}

    <div class="grid">
      <div class="groups">
        {#each d.groups as g, gi (g.title)}
          <section class="card">
            <div class="gh">
              <h3>{g.title}</h3>
              {#if canManage}<span class="tools"><button type="button" onclick={() => setGroup(gi, true)}>Tout cocher</button><button type="button" onclick={() => setGroup(gi, false)}>Tout décocher</button></span>{/if}
            </div>
            {#each g.fields as f (f.key)}
              <div class="fld" class:empty={!f.filled && !f.optional}>
                <label class="ck"><input type="checkbox" bind:checked={checked[f.key]} disabled={!canManage} /><span>{f.label}</span></label>
                <div class="val">
                  {#if f.kind === "text"}
                    <b>{f.value ?? "—"}</b>
                  {:else if f.kind === "file"}
                    {#if f.value}<button type="button" class="file" onclick={() => view(String(f.value))}>{#if isImg(String(f.value))}<img src={String(f.value)} alt={f.label} />{:else}<FileText size={18} /> PDF{/if}</button>{:else}<b>—</b>{/if}
                  {:else if Array.isArray(f.value) && f.value.length}
                    {@const urls = f.value as string[]}
                    <span class="files">{#each urls as u, i (u)}<button type="button" class="file" onclick={() => view(u)}>{#if isImg(u)}<img src={u} alt={`${f.label} ${i + 1}`} />{:else}<FileText size={18} /> PDF {i + 1}{/if}</button>{/each}</span>
                  {:else}<b>—</b>{/if}
                </div>
              </div>
            {/each}
          </section>
        {/each}
      </div>

      <aside class="side">
        <section class="card">
          <h3>Contrat de partenariat</h3>
          {#if d.signature}
            <img class="sig" src={d.signature} alt="Signature du prestataire" />
            {#if d.contract_pdf}<button type="button" class="link" onclick={() => view(d!.contract_pdf!)}>Voir le contrat signé</button>{/if}
          {:else}<p class="muted">Pas de signature.</p>{/if}
        </section>
        {#if canManage}
          <section class="card">
            <h3>Décision</h3>
            <label class="nl" for="note">Message au prestataire <small>(obligatoire pour un refus)</small></label>
            <textarea id="note" rows="4" maxlength="1000" bind:value={note} placeholder="Ex. Pièce d'identité illisible, merci de la renvoyer."></textarea>
            {#if uncheckedLabels.length}<p class="muted">Non validés : {uncheckedLabels.join(", ")}</p>{/if}
            <div class="decide">
              <Btn class="btn-primary" onclick={approve}><Check size={15} /> Approuver</Btn>
              <Btn class="btn-outline btn-danger" onclick={() => (rejecting = true)}>Refuser</Btn>
            </div>
          </section>
        {/if}
      </aside>
    </div>
  </div>

  <Modal open={rejecting} title="Refuser ce dossier ?" width="30rem" locked={pending.is("reject")} onclose={() => (rejecting = false)}>
    <p class="muted">Le prestataire recevra votre message et la liste des éléments non validés, puis pourra corriger et renvoyer son dossier.</p>
    <label class="nl" for="rnote">Motif *</label>
    <textarea id="rnote" rows="4" maxlength="1000" bind:value={note}></textarea>
    {#snippet footer()}
      <Btn class="btn-outline" onclick={() => (rejecting = false)} disabled={pending.is("reject")}>Annuler</Btn>
      <Btn class="btn-danger" loading={pending.is("reject")} onclick={reject}>Refuser le dossier</Btn>
    {/snippet}
  </Modal>
{/if}

<style>
  .state { padding: 3rem 1rem; text-align: center; color: #9ca3af; }
  .pg { display: flex; flex-direction: column; gap: 1rem; }
  .head { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem 1.2rem; }
  .av { width: 3.4rem; height: 3.4rem; border-radius: 50%; background: #04330d; color: #ffc72c; display: grid; place-items: center; font-weight: 800; overflow: hidden; flex: none; }
  .av img { width: 100%; height: 100%; object-fit: cover; }
  .who { flex: 1; min-width: 14rem; }
  .who h2 { margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .who p { margin: 0.25rem 0; display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #374151; }
  .who p span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .who small { color: #6b7280; }
  .count { text-align: center; }
  .count strong { display: block; font-size: 1.5rem; }
  .count span { font-size: 0.75rem; color: #6b7280; }
  .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.approved { background: #d1fae5; color: #065f46; }
  .badge.rejected { background: #fee2e2; color: #991b1b; }
  .sigcard { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: center; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 0.9rem 1.1rem; }
  .sigcard strong { display: inline-flex; align-items: center; gap: 0.4rem; }
  .sigcard p { margin: 0.3rem 0; font-size: 0.85rem; }
  .sigcard img { height: 3.4rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.2rem; }
  .acts { display: flex; gap: 0.5rem; }
  .grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .groups, .side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .side { position: sticky; top: 1rem; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.1rem 1.2rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .card h3 { margin: 0; font-size: 1rem; }
  .gh { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .tools { display: flex; gap: 0.6rem; }
  .tools button, .link { background: none; border: none; color: #2563eb; font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 0; }
  .fld { display: grid; grid-template-columns: minmax(10rem, 1fr) 1.4fr; gap: 0.8rem; align-items: center; padding: 0.55rem 0; border-top: 1px solid #f0f1f3; }
  .fld.empty { background: #fffaf0; }
  .ck { display: flex; align-items: center; gap: 0.55rem; font-size: 0.85rem; color: #374151; font-weight: 600; }
  .val b { font-size: 0.9rem; color: #111827; overflow-wrap: anywhere; font-weight: 600; }
  .files { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .file { display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 0.2rem; cursor: zoom-in; font: inherit; font-size: 0.78rem; color: #374151; }
  .file img { height: 3.6rem; max-width: 7rem; object-fit: cover; border-radius: 6px; }
  .sig { max-height: 5.5rem; align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.25rem; }
  .muted { margin: 0; color: #6b7280; font-size: 0.82rem; }
  .nl { font-size: 0.82rem; font-weight: 700; }
  .nl small { color: #6b7280; font-weight: 500; }
  textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; resize: vertical; box-sizing: border-box; }
  .decide { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  @media (max-width: 1000px) { .grid { grid-template-columns: minmax(0, 1fr); } .side { position: static; } }
  @media (max-width: 560px) { .fld { grid-template-columns: 1fr; gap: 0.3rem; } }
</style>
