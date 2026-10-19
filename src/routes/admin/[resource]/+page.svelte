<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/stores";
  import Btn from "$lib/components/Btn.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import DataTable from "$lib/components/admin/DataTable.svelte";
  import type { Column } from "$lib/components/admin/table";
  import { referralUsers, resAction, resCreate, resDelete, resList, resMeta, resOptions, resUpdate, type ResColumn, type ResMeta, type ResOption, type ResRow } from "$lib/api/adminResources";
  import { adminUploadImage } from "$lib/api/home";
  import { confirmDialog } from "$lib/stores/confirm.svelte";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Search from "@lucide/svelte/icons/search";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Users from "@lucide/svelte/icons/users";

  /**
   * Page generique des menus d'administration decrits cote serveur (`services/admin_resources.py`) :
   * coupons, clients, villes, quartiers, categories, sous-categories, unites, parrainage, demandes de reservation,
   * suppressions de compte, notifications. Colonnes, champs du formulaire, filtres et actions viennent de `GET /admin-resources/{cle}/meta`.
   */
  const SLUGS: Record<string, string> = {
    clients: "clients",
    coupons: "coupons",
    villes: "cities",
    quartiers: "districts",
    categories: "categories",
    "sous-categories": "subcategories",
    unites: "unities",
    parrainage: "referrals",
    demandes: "booking_requests",
    suppressions: "account_deletions",
    notifications: "notifications",
  };
  const PAGE_SIZE = 20;

  let slug = $derived($page.params.resource ?? "");
  let key = $derived(SLUGS[slug] ?? "");

  let meta = $state<ResMeta | null>(null);
  let rows = $state<ResRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state("");
  let q = $state("");
  let pageNo = $state(1);
  let filters = $state<Record<string, string>>({});
  let lookups = $state<Record<string, ResOption[]>>({});

  // Formulaire
  let editing = $state<ResRow | "new" | null>(null);
  let form = $state<Record<string, any>>({});
  let saving = $state(false);
  let uploading = $state<string | null>(null);
  let users = $state<{ title: string; rows: Awaited<ReturnType<typeof referralUsers>> } | null>(null);

  let seq = 0;
  async function load() {
    if (!key) return;
    const mine = ++seq;
    loading = true;
    error = "";
    try {
      const res = await resList(key, { q: q.trim(), page: pageNo, page_size: PAGE_SIZE, filters });
      if (mine !== seq) return;
      rows = res.items;
      total = res.total;
    } catch (e) {
      if (mine === seq) {
        error = (e as Error).message;
        rows = [];
        total = 0;
      }
    } finally {
      if (mine === seq) loading = false;
    }
  }

  async function ensureLookup(name: string) {
    if (lookups[name]) return;
    try {
      lookups[name] = await resOptions(name);
    } catch {
      lookups[name] = [];
    }
  }

  // Changement de menu : on repart de zero.
  // `untrack` : resMeta() declenche apiLoading.start() (lecture ET ecriture de l'etat partage) de facon synchrone ;
  // sans cela l'effet devient sa propre dependance et se relance sans fin (effect_update_depth_exceeded).
  $effect(() => {
    const k = key;
    untrack(() => {
      meta = null;
      rows = [];
      total = 0;
      q = "";
      pageNo = 1;
      filters = {};
      lookups = {};
      editing = null;
      if (!k) {
        loading = false;
        return;
      }
      loading = true;
      resMeta(k)
        .then(async (m) => {
          if (k !== key) return;
          meta = m;
          await Promise.all(m.filters.filter((f) => f.lookup).map((f) => ensureLookup(f.lookup!)));
          await load();
        })
        .catch((e) => {
          error = (e as Error).message;
          loading = false;
        });
    });
  });

  function refilter() {
    pageNo = 1;
    load();
  }
  let timer: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(timer);
    timer = setTimeout(refilter, 350);
  }
  function go(p: number) {
    pageNo = p;
    load();
  }

  // ------------------------------------------------------------ colonnes
  let columns = $derived.by<Column<ResRow>[]>(() => {
    if (!meta) return [];
    const cols: Column<ResRow>[] = meta.columns.map((c) => ({ key: c.key, label: c.label, width: c.width ?? undefined, align: c.kind === "money" ? "right" : "left" }));
    if (meta.has_created && meta.created_col) cols.push({ key: meta.created_col, label: "Créé le", width: "9rem", hideOnSmall: true });
    return cols;
  });
  const colMeta = (c: Column<ResRow>): ResColumn => meta?.columns.find((x) => x.key === c.key) ?? ({ key: c.key, label: c.label, kind: "date", lookup: false, options: [], width: null } as ResColumn);

  const fmtDate = (v: unknown) => {
    if (!v) return "—";
    const d = new Date(String(v) + (String(v).endsWith("Z") || String(v).length <= 10 ? "" : "Z"));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", ...(String(v).length > 10 ? { hour: "2-digit", minute: "2-digit" } : {}) });
  };
  const truthy = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";
  const label = (c: ResColumn, v: unknown) => c.options.find((o) => o.value === String(v))?.label ?? (v === null || v === undefined || v === "" ? "—" : String(v));
  const src = (v: string) => (/^(https?:)?\/\//.test(v) || v.startsWith("data:") ? v : "");

  // ------------------------------------------------------------ formulaire
  function openNew() {
    if (!meta) return;
    const f: Record<string, any> = {};
    for (const x of meta.fields) {
      if (x.lookup) ensureLookup(x.lookup);
      f[x.name] = x.kind === "switch" ? truthy(x.default) : (x.default ?? "");
    }
    form = f;
    editing = "new";
  }
  function openEdit(r: ResRow) {
    if (!meta) return;
    const f: Record<string, any> = {};
    for (const x of meta.fields) {
      if (x.lookup) ensureLookup(x.lookup);
      const v = r[x.name];
      f[x.name] = x.kind === "switch" ? truthy(v) : v === null || v === undefined ? "" : String(v);
    }
    form = f;
    editing = r;
  }
  const visibleFields = $derived(meta ? meta.fields.filter((f) => editing === "new" || !f.create_only) : []);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!meta || !editing) return;
    saving = true;
    try {
      const body: Record<string, unknown> = {};
      for (const f of visibleFields) body[f.name] = form[f.name];
      if (editing === "new") await resCreate(meta.key, body);
      else await resUpdate(meta.key, editing._id, body);
      snackbar.success(editing === "new" ? "Élément ajouté." : "Modifications enregistrées.");
      editing = null;
      await load();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      saving = false;
    }
  }

  async function upload(name: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      snackbar.error("Choisissez un fichier image (JPG, PNG, WebP).");
      return;
    }
    uploading = name;
    try {
      form[name] = (await adminUploadImage(file)).url;
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      uploading = null;
    }
  }

  async function remove(r: ResRow) {
    if (!meta) return;
    const m = meta;
    const ok = await confirmDialog.ask({
      title: `Supprimer ce ${m.singular} ?`,
      message: "Cette action est définitive. Si l'élément est utilisé ailleurs, la suppression sera refusée : désactivez-le alors plutôt que de le supprimer.",
      confirmLabel: "Supprimer",
      tone: "danger",
      action: async () => {
        await resDelete(m.key, r._id);
        await load();
      },
    });
    if (ok) snackbar.success("Élément supprimé.");
  }

  async function runAction(r: ResRow, a: ResMeta["actions"][number]) {
    if (!meta) return;
    const m = meta;
    const exec = async () => {
      const res = await resAction(m.key, r._id, a.key);
      snackbar.success(res.message);
      await load();
    };
    if (a.confirm) await confirmDialog.ask({ title: a.label, message: a.confirm, confirmLabel: a.label, tone: a.tone === "danger" ? "danger" : "default", action: exec });
    else
      try {
        await exec();
      } catch (e) {
        snackbar.error((e as Error).message);
      }
  }

  async function showUsers(r: ResRow) {
    try {
      users = { title: `Utilisateurs du code ${r.rc_code}`, rows: await referralUsers(r._id) };
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }
  const canWrite = $derived(!!meta && (meta.can.update || meta.can.delete || meta.can.actions));
</script>

{#snippet cellOf(row: ResRow, c: Column<ResRow>)}
  {@const m = colMeta(c)}
  {@const v = row[c.key]}
  {#if m.kind === "lookup"}{row[c.key + "__label"] ?? (v ?? "—")}
  {:else if m.kind === "bool"}<span class="pill {truthy(v) ? 'on' : 'off'}">{truthy(v) ? "Oui" : "Non"}</span>
  {:else if m.kind === "badge"}<span class="pill info">{label(m, v)}</span>
  {:else if m.kind === "code"}<code class="code">{v ?? "—"}</code>
  {:else if m.kind === "money"}<strong>{v === null || v === undefined ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`}</strong>
  {:else if m.kind === "image"}{#if v && src(String(v))}<img class="thumb" src={src(String(v))} alt="" loading="lazy" onerror={(e) => ((e.currentTarget as HTMLElement).style.display = "none")} />{:else}<span class="muted">{v ? "Fichier" : "—"}</span>{/if}
  {:else if m.kind === "date"}<span class="muted dark">{fmtDate(v)}</span>
  {:else}<span class="txt" title={v ? String(v) : ""}>{v === null || v === undefined || v === "" ? "—" : String(v)}</span>
  {/if}
{/snippet}

{#snippet rowActions(r: ResRow)}
  {#if meta}
    {#if meta.key === "referrals"}<button type="button" class="ico" title="Utilisateurs" aria-label="Utilisateurs" onclick={() => showUsers(r)}><Users size={15} /></button>{/if}
    {#each meta.actions.filter((a) => r._actions.includes(a.key)) as a (a.key)}
      {#if meta.can.actions}<button type="button" class="act {a.tone}" onclick={() => runAction(r, a)}>{a.label}</button>{/if}
    {/each}
    {#if meta.can.update}<button type="button" class="ico" title="Modifier" aria-label="Modifier" onclick={() => openEdit(r)}><Pencil size={15} /></button>{/if}
    {#if meta.can.delete && r._can_delete}<button type="button" class="ico danger" title="Supprimer" aria-label="Supprimer" onclick={() => remove(r)}><Trash2 size={15} /></button>{/if}
  {/if}
{/snippet}

{#if !key}
  <div class="page"><p class="desc">Cette page n'existe pas.</p></div>
{:else}
  <div class="page">
    {#if meta?.description}<p class="desc">{meta.description}</p>{/if}

    <div class="toolbar">
      <div class="filters">
        {#if meta?.search}
          <label class="search"><Search size={15} /><input type="search" placeholder="Rechercher…" bind:value={q} oninput={onSearch} /></label>
        {/if}
        {#if meta}
          {#each meta.filters as f (f.key)}
            <select bind:value={filters[f.key]} onchange={refilter} aria-label={f.label}>
              <option value="">{f.label} : tous</option>
              {#each f.lookup ? (lookups[f.lookup] ?? []) : f.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
            </select>
          {/each}
        {/if}
      </div>
      {#if meta?.can.create}<Btn class="btn-primary" onclick={openNew}><Plus size={16} /> Ajouter</Btn>{/if}
    </div>

    {#if error}<div class="err">{error}</div>{/if}

    <DataTable
      {columns}
      {rows}
      rowKey={(r) => r._id}
      {loading}
      page={pageNo}
      pageSize={PAGE_SIZE}
      {total}
      itemLabel="éléments"
      emptyTitle="Aucun élément"
      emptyText={q || Object.values(filters).some(Boolean) ? "Aucun résultat pour ces critères." : "Rien à afficher pour le moment."}
      onpage={go}
      {cellOf}
      actions={canWrite || meta?.key === "referrals" ? rowActions : undefined}
      actionsLabel=""
      actionsWidth="14rem"
    />
  </div>

  <Modal open={editing !== null} title={editing === "new" ? `Ajouter · ${meta?.singular ?? ""}` : `Modifier · ${meta?.singular ?? ""}`} width="36rem" locked={saving} onclose={() => (editing = null)}>
    <form id="res-form" class="rf" onsubmit={save}>
      {#each visibleFields as f (f.name)}
        <div class="fld" class:full={f.kind === "textarea" || f.kind === "image" || f.kind === "switch"}>
          {#if f.kind === "switch"}
            <label class="sw"><input type="checkbox" bind:checked={form[f.name]} /> <span>{f.label}</span></label>
          {:else}
            <label for="rf-{f.name}">{f.label}{#if f.required} <b class="req">*</b>{/if}</label>
            {#if f.kind === "textarea"}
              <textarea id="rf-{f.name}" rows="4" bind:value={form[f.name]} required={f.required} maxlength={f.max ?? undefined}></textarea>
            {:else if f.kind === "select"}
              <select id="rf-{f.name}" bind:value={form[f.name]} required={f.required}>
                <option value="">{f.required ? "Choisir…" : "—"}</option>
                {#each f.lookup ? (lookups[f.lookup] ?? []) : f.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
              </select>
            {:else if f.kind === "image"}
              <div class="img">
                {#if form[f.name] && src(String(form[f.name]))}<img src={src(String(form[f.name]))} alt="" />{/if}
                <label class="up"><ImagePlus size={15} /> {uploading === f.name ? "Envoi…" : form[f.name] ? "Changer l'image" : "Ajouter une image"}<input type="file" accept="image/*" onchange={(e) => upload(f.name, e.currentTarget.files?.[0])} /></label>
                {#if form[f.name] && !src(String(form[f.name]))}<small class="muted">Image actuelle : {form[f.name]}</small>{/if}
              </div>
            {:else}
              <input
                id="rf-{f.name}"
                type={f.kind === "number" ? "number" : f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : f.kind === "password" ? "password" : "text"}
                step={f.kind === "number" ? "any" : undefined}
                autocomplete={f.kind === "password" ? "new-password" : "off"}
                bind:value={form[f.name]}
                required={f.required}
                maxlength={f.max ?? undefined}
                style:text-transform={f.upper ? "uppercase" : undefined}
              />
            {/if}
            {#if f.help}<small class="help">{f.help}</small>{/if}
          {/if}
        </div>
      {/each}
    </form>
    {#snippet footer()}
      <Btn class="btn-outline" disabled={saving} onclick={() => (editing = null)}>Annuler</Btn>
      <Btn type="submit" form="res-form" class="btn-primary" loading={saving}>{editing === "new" ? "Ajouter" : "Enregistrer"}</Btn>
    {/snippet}
  </Modal>

  <Modal open={users !== null} title={users?.title ?? ""} width="40rem" onclose={() => (users = null)}>
    {#if users}
      {#if users.rows.length === 0}
        <p class="muted">Aucun compte n'a encore utilisé ce code.</p>
      {:else}
        <table class="ut">
          <thead><tr><th>Identifiant</th><th>Nom</th><th>E-mail</th><th>Téléphone</th></tr></thead>
          <tbody>
            {#each users.rows as u (u.client_id)}<tr><td><code class="code">{u.client_unique_id}</code></td><td>{u.client_name} {u.client_family_name ?? ""}</td><td>{u.client_email}</td><td>{u.client_phone}</td></tr>{/each}
          </tbody>
        </table>
      {/if}
    {/if}
    {#snippet footer()}<Btn class="btn-outline" onclick={() => (users = null)}>Fermer</Btn>{/snippet}
  </Modal>
{/if}

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; }
  .desc { margin: 0; color: #6b7280; font-size: 0.9rem; max-width: 56rem; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
  .filters { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .filters select { padding: 0.5rem 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; font: inherit; font-size: 0.85rem; }
  .search { display: flex; align-items: center; gap: 0.4rem; min-width: 16rem; padding: 0 0.7rem; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #6b7280; }
  .search input { flex: 1; border: none; outline: none; padding: 0.55rem 0; font: inherit; background: none; min-width: 0; }
  .search:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .err { padding: 0.8rem 1rem; border-radius: 10px; background: #fef2f2; color: #991b1b; font-size: 0.88rem; }
  .pill { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .pill.on { background: #d1fae5; color: #065f46; }
  .pill.off { background: #f3f4f6; color: #6b7280; }
  .pill.info { background: #e0e7ff; color: #3730a3; }
  .code { padding: 0.12rem 0.45rem; border-radius: 6px; background: #f3f4f6; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.03em; }
  .thumb { width: 2.6rem; height: 2.6rem; border-radius: 8px; object-fit: cover; background: #f3f4f6; }
  .txt { display: inline-block; max-width: 22rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
  .muted { color: #9ca3af; font-size: 0.82rem; }
  .muted.dark { color: #374151; }
  .ico { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #374151; cursor: pointer; }
  .ico:hover { background: #f3f4f6; }
  .ico.danger { color: #b42318; }
  .ico.danger:hover { background: #fef2f2; border-color: #fecaca; }
  .act { padding: 0.35rem 0.7rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #1f2937; font: inherit; font-weight: 700; font-size: 0.76rem; cursor: pointer; white-space: nowrap; }
  .act:hover { background: #f3f4f6; }
  .act.danger { color: #b42318; border-color: #fecaca; }
  .rf { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem 1rem; }
  .fld { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
  .fld.full { grid-column: 1 / -1; }
  .fld > label { font-size: 0.8rem; font-weight: 700; color: #374151; }
  .req { color: #dc2626; }
  .fld input[type="text"], .fld input[type="number"], .fld input[type="email"], .fld input[type="tel"], .fld input[type="password"], .fld select, .fld textarea {
    padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; font-size: 0.9rem; background: #fff; width: 100%;
  }
  .fld input:focus, .fld select:focus, .fld textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  .help { color: #6b7280; font-size: 0.76rem; }
  .sw { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 700; color: #374151; cursor: pointer; }
  .img { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .img img { width: 5rem; height: 5rem; border-radius: 12px; object-fit: cover; border: 1px solid #e5e7eb; }
  .up { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border: 1px dashed #9ca3af; border-radius: 10px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #374151; }
  .up:hover { background: #f9fafb; }
  .up input { display: none; }
  .ut { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .ut th { text-align: left; color: #6b7280; padding: 0.4rem 0.5rem; border-bottom: 1px solid #e5e7eb; }
  .ut td { padding: 0.45rem 0.5rem; border-bottom: 1px solid #f1f2f4; }
  @media (max-width: 640px) { .rf { grid-template-columns: 1fr; } }
</style>
