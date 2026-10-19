<script lang="ts">
  import { onMount } from "svelte";
  import {
    adminCreateCountry,
    adminDeleteCountry,
    adminInitializeCountries,
    adminListCountries,
    adminMarketplaceCountries,
    adminReorderCountries,
    adminUpdateCountry,
    type Country,
    type CountryInput,
    type MarketplaceCountry,
  } from "$lib/api/configuration";
  import { clearHomeCache } from "$lib/api/home";
  import Btn from "$lib/components/Btn.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { Pending } from "$lib/stores/pending.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Star from "@lucide/svelte/icons/star";

  const EMPTY: CountryInput = {
    code: "", name: "", name_en: "", marketplace_country_id: null, calling_code: "", currency_code: "XOF",
    payment_text: "", payment_text_en: "", help_url: "", is_active: true, is_default: false,
  };

  let countries = $state<Country[]>([]);
  let marketplace = $state<MarketplaceCountry[]>([]);
  let loading = $state(true);
  const pending = new Pending();
  // Creer / supprimer / reordonner les pays touche tout le site : reserve a qui a acces a tous les pays.
  let canAdmin = $derived(!!auth.admin?.all_countries);
  // null = formulaire ferme ; id = edition ; "new" = creation
  let editing = $state<number | "new" | null>(null);
  let form = $state<CountryInput>({ ...EMPTY });

  async function refresh() {
    loading = true;
    try {
      countries = await adminListCountries();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    refresh();
    adminMarketplaceCountries().then((r) => (marketplace = r)).catch(() => {});
  });

  const written = () => clearHomeCache();

  function openNew() {
    form = { ...EMPTY };
    editing = "new";
  }
  function openEdit(c: Country) {
    const { id: _id, marketplace_country_name: _n, ...rest } = c;
    form = { ...EMPTY, ...rest };
    editing = c.id;
  }

  // Choisir un pays du marketplace pre-remplit les champs encore vides.
  function onPickMarketplace(value: string) {
    form.marketplace_country_id = value ? Number(value) : null;
    const m = marketplace.find((x) => x.id === form.marketplace_country_id);
    if (!m) return;
    if (!form.code) form.code = m.code.slice(0, 2).toUpperCase();
    if (!form.name) form.name = m.name;
    if (!form.calling_code && m.calling_code) form.calling_code = m.calling_code.replace(/\D/g, "");
  }

  function clean(f: CountryInput): CountryInput {
    const n = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
    return {
      ...f, code: f.code.trim().toUpperCase(), name: f.name.trim(), name_en: n(f.name_en), calling_code: n(f.calling_code), currency_code: n(f.currency_code),
      payment_text: n(f.payment_text), payment_text_en: n(f.payment_text_en), help_url: n(f.help_url),
    };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const creating = editing === "new";
    await pending.run("save", async () => {
      try {
        if (creating) await adminCreateCountry(clean(form));
        else if (typeof editing === "number") await adminUpdateCountry(editing, clean(form));
        snackbar.success(creating ? `Pays « ${form.name} » ajouté.` : `Pays « ${form.name} » mis à jour.`);
        editing = null;
        written();
        await refresh();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function toggleActive(c: Country) {
    await pending.run(`toggle:${c.id}`, async () => {
      try {
        const { id: _id, marketplace_country_name: _n, ...rest } = c;
        await adminUpdateCountry(c.id, { ...rest, is_active: !c.is_active });
        written();
        await refresh();
        snackbar.success(c.is_active ? `${c.name} masqué du site.` : `${c.name} affiché sur le site.`);
      } catch (e) {
        snackbar.error((e as Error).message);
        await refresh(); // remet la case a cocher dans son etat reel
      }
    });
  }

  async function makeDefault(c: Country) {
    if (c.is_default) return;
    await pending.run(`default:${c.id}`, async () => {
      try {
        const { id: _id, marketplace_country_name: _n, ...rest } = c;
        await adminUpdateCountry(c.id, { ...rest, is_default: true, is_active: true });
        written();
        await refresh();
        snackbar.success(`${c.name} est maintenant le pays par défaut.`);
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  async function remove(c: Country) {
    const done = await confirmDialog.ask({
      title: `Supprimer « ${c.name} » ?`,
      message: "Ce pays disparaîtra de la bande verte du site. Les prestataires ne sont pas supprimés.",
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await adminDeleteCountry(c.id);
        written();
        await refresh();
      },
    });
    if (done) snackbar.success(`Pays « ${c.name} » supprimé.`);
  }

  async function move(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= countries.length) return;
    const next = [...countries];
    [next[index], next[j]] = [next[j], next[index]];
    countries = next;
    await pending.run("order", async () => {
      try {
        await adminReorderCountries(next.map((c) => c.id));
        written();
        snackbar.success("Ordre enregistré.");
      } catch (e) {
        snackbar.error((e as Error).message);
        await refresh();
      }
    });
  }

  async function initialize() {
    await pending.run("init", async () => {
      try {
        countries = await adminInitializeCountries();
        written();
        snackbar.success("Pays par défaut enregistrés.");
      } catch (e) {
        snackbar.error((e as Error).message);
      }
    });
  }

  let activeCountries = $derived(countries.filter((c) => c.is_active));
</script>

<div class="countries">
  <div class="intro">
    <p>
      Les pays actifs apparaissent dans la <strong>bande verte</strong> en haut du site (sélecteur de pays, moyens de paiement et lien d'aide du pays choisi)
      et servent à filtrer les prestataires. Tant qu'aucun pays n'est enregistré ici, le site garde sa liste actuelle.
    </p>
    <div class="head-actions">
      {#if canAdmin && countries.length === 0}
        <Btn class="btn-outline btn-sm" loading={pending.is("init")} onclick={initialize}>Enregistrer les pays actuels (Togo, Côte d'Ivoire, Bénin)</Btn>
      {/if}
      {#if canAdmin}<button type="button" class="btn btn-gold btn-sm" onclick={openNew}><Plus size={14} /> Ajouter un pays</button>{/if}
    </div>
  </div>

  {#if activeCountries.length > 0}
    <div class="preview" aria-label="Aperçu de la bande verte">
      <span class="preview-label">Aperçu :</span>
      {#each activeCountries as c}
        <span class="chip" class:on={c.is_default}>{c.code} · {c.name}</span>
      {/each}
    </div>
  {/if}

  {#if editing !== null}
    <form class="card form" onsubmit={save}>
      <h3>{editing === "new" ? "Nouveau pays" : `Modifier ${form.name || form.code}`}</h3>
      <div class="grid">
        <label>Pays du marketplace Trankyl (optionnel)
          <select value={form.marketplace_country_id ?? ""} onchange={(e) => onPickMarketplace(e.currentTarget.value)}>
            <option value="">— Aucun —</option>
            {#each marketplace as m}<option value={m.id}>{m.name} ({m.code}){m.has_service ? " ★" : ""}</option>{/each}
          </select>
          <small>Sert à filtrer les prestataires par pays. ★ = pays avec service actif.</small>
        </label>
        <label>Code pays (2 lettres)<input type="text" maxlength="2" required bind:value={form.code} placeholder="TG" style="text-transform: uppercase" /></label>
        <label>Nom (FR)<input type="text" required bind:value={form.name} placeholder="Togo" /></label>
        <label>Nom (EN)<input type="text" bind:value={form.name_en} placeholder="Togo" /></label>
        <label>Indicatif téléphonique<input type="text" bind:value={form.calling_code} placeholder="228" /></label>
        <label>Devise<input type="text" bind:value={form.currency_code} placeholder="XOF" /></label>
        <label class="span2">Moyens de paiement affichés (FR)<input type="text" bind:value={form.payment_text} placeholder="Paiement : Mixx by Yas · Flooz · Carte" /></label>
        <label class="span2">Moyens de paiement affichés (EN)<input type="text" bind:value={form.payment_text_en} placeholder="Payment: Mixx by Yas · Flooz · Card" /></label>
        <label class="span2">Lien « Aide WhatsApp »<input type="url" bind:value={form.help_url} placeholder="https://wa.me/228XXXXXXXX" /><small>Le lien d'aide n'apparaît dans la bande verte que s'il est renseigné.</small></label>
      </div>
      <div class="checks">
        <label class="switch"><input type="checkbox" bind:checked={form.is_active} /> Actif (visible sur le site)</label>
        <label class="switch"><input type="checkbox" bind:checked={form.is_default} /> Pays par défaut</label>
      </div>
      <div class="actions">
        <Btn class="btn-ghost" disabled={pending.is("save")} onclick={() => (editing = null)}>Annuler</Btn>
        <Btn type="submit" class="btn-primary" loading={pending.is("save")}>Enregistrer</Btn>
      </div>
    </form>
  {/if}

  {#if loading && countries.length === 0}
    <div class="loading-state">Chargement...</div>
  {:else if countries.length === 0}
    <p class="empty">Aucun pays enregistré : le site utilise sa liste actuelle (Togo, Côte d'Ivoire, Bénin).</p>
  {:else}
    <div class="list">
      {#each countries as c, i (c.id)}
        <article class="card row" class:off={!c.is_active}>
          <div class="main">
            <div class="title">
              <span class="code">{c.code}</span>
              <strong>{c.name}</strong>
              {#if c.name_en && c.name_en !== c.name}<span class="muted">({c.name_en})</span>{/if}
              {#if c.is_default}<span class="badge">Par défaut</span>{/if}
              {#if !c.is_active}<span class="badge off">Inactif</span>{/if}
            </div>
            <p class="meta">
              {c.payment_text || "Pas de moyens de paiement spécifiques"}
              · {c.help_url ? "Aide WhatsApp configurée" : "Pas de lien d'aide"}
              · {c.marketplace_country_name ? `Lié à « ${c.marketplace_country_name} »` : "Non lié au marketplace"}
            </p>
          </div>
          <div class="row-actions">
            {#if canAdmin}
            <button type="button" aria-label="Monter" disabled={i === 0 || pending.is("order")} onclick={() => move(i, -1)}><ArrowUp size={15} /></button>
            <button type="button" aria-label="Descendre" disabled={i === countries.length - 1 || pending.is("order")} onclick={() => move(i, 1)}><ArrowDown size={15} /></button>
            {/if}
            <button type="button" aria-label="Définir par défaut" title="Définir par défaut" class:star={c.is_default} disabled={pending.is(`default:${c.id}`)} onclick={() => makeDefault(c)}>{#if pending.is(`default:${c.id}`)}<Spinner size="15px" />{:else}<Star size={15} />{/if}</button>
            <label class="switch mini" title="Actif / inactif">{#if pending.is(`toggle:${c.id}`)}<Spinner size="15px" />{:else}<input type="checkbox" checked={c.is_active} onchange={() => toggleActive(c)} />{/if}</label>
            <button type="button" aria-label="Modifier" onclick={() => openEdit(c)}><Pencil size={15} /></button>
            {#if canAdmin}<button type="button" aria-label="Supprimer" class="danger" onclick={() => remove(c)}><Trash2 size={15} /></button>{/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .countries {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .intro {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .intro p {
    margin: 0;
    max-width: 52rem;
    color: var(--ink-soft);
  }
  .head-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    background: #0a5a2e;
    border-radius: 12px;
    padding: 0.6rem 1rem;
    color: #fff;
    font-size: 0.8rem;
  }
  .chip {
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 999px;
    padding: 0.25rem 0.8rem;
    font-weight: 600;
  }
  .chip.on {
    background: #ffc629;
    border-color: #ffc629;
    color: #1b2620;
  }
  .form h3 {
    margin: 0 0 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
  }
  .grid label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .grid input,
  .grid select {
    width: 100%;
  }
  .grid small {
    font-weight: 400;
    color: var(--muted);
  }
  .span2 {
    grid-column: 1 / -1;
  }
  .checks {
    display: flex;
    gap: 1.6rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.1rem;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1.1rem;
  }
  .row.off {
    opacity: 0.6;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .code {
    background: var(--green-soft);
    color: var(--green-deep);
    border-radius: 8px;
    padding: 0.15rem 0.5rem;
    font-weight: 800;
    font-size: 0.8rem;
  }
  .badge {
    background: #ffe9a8;
    color: #6b4f00;
    border-radius: 999px;
    padding: 0.1rem 0.6rem;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .badge.off {
    background: #ececef;
    color: #3f444d;
  }
  .muted {
    color: var(--muted);
    font-size: 0.82rem;
  }
  .meta {
    margin: 0.3rem 0 0;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex: none;
  }
  .row-actions button {
    border: 0;
    background: transparent;
    padding: 0.4rem;
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: grid;
    place-items: center;
  }
  .row-actions button:hover:not(:disabled) {
    background: rgba(15, 23, 32, 0.08);
  }
  .row-actions button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .row-actions .star {
    color: #b07d00;
  }
  .row-actions .danger:hover {
    color: var(--danger);
  }
  .mini {
    padding: 0 0.4rem;
  }
  .empty {
    color: var(--muted);
  }
  @media (max-width: 800px) {
    .intro,
    .row {
      flex-direction: column;
      align-items: stretch;
    }
    .grid {
      grid-template-columns: 1fr;
    }
    .row-actions {
      justify-content: flex-end;
    }
  }
</style>
