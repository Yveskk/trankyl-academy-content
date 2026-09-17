<script lang="ts">
  import { adminGetArticle, adminListArticles, createArticle, deleteArticle, updateArticle, uploadCoverImage } from "$lib/api/blog";
  import type { BlogArticle } from "$lib/api/types";
  import { snackbar } from "$lib/stores/snackbar.svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import ImagePlus from "@lucide/svelte/icons/image-plus";
  import Loader from "@lucide/svelte/icons/loader";
  import X from "@lucide/svelte/icons/x";

  let articles = $state<BlogArticle[]>([]);
  let loading = $state(true);

  const emptyForm = () => ({
    slug: "",
    title: "",
    excerpt: "",
    category: "",
    title_en: "",
    excerpt_en: "",
    category_en: "",
    read_time: "3 min",
    cover: "green" as "green" | "gold",
    cover_image_url: null as string | null,
    published_at: new Date().toISOString().slice(0, 10),
    contentText: "",
    contentTextEn: "",
  });

  let showNewForm = $state(false);
  let newForm = $state(emptyForm());
  let uploadingNew = $state(false);

  let editingId = $state<number | null>(null);
  let editForm = $state(emptyForm());
  let uploadingEdit = $state(false);

  async function handleImageSelect(event: Event, target: "new" | "edit") {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (target === "new") uploadingNew = true;
    else uploadingEdit = true;

    try {
      const { url } = await uploadCoverImage(file);
      if (target === "new") newForm.cover_image_url = url;
      else editForm.cover_image_url = url;
      snackbar.success("Image téléversée.");
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      if (target === "new") uploadingNew = false;
      else uploadingEdit = false;
      input.value = "";
    }
  }

  async function refresh() {
    loading = true;
    try {
      articles = await adminListArticles();
    } catch (e) {
      snackbar.error((e as Error).message);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  function splitContent(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault();
    try {
      await createArticle({
        slug: newForm.slug,
        title: newForm.title,
        excerpt: newForm.excerpt,
        category: newForm.category,
        title_en: newForm.title_en || undefined,
        excerpt_en: newForm.excerpt_en || undefined,
        category_en: newForm.category_en || undefined,
        read_time: newForm.read_time,
        cover: newForm.cover,
        cover_image_url: newForm.cover_image_url,
        published_at: newForm.published_at,
        content: splitContent(newForm.contentText),
        content_en: newForm.contentTextEn ? splitContent(newForm.contentTextEn) : undefined,
      });
      newForm = emptyForm();
      showNewForm = false;
      snackbar.success("Article créé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function startEdit(article: BlogArticle) {
    try {
      const detail = await adminGetArticle(article.id);
      editingId = article.id;
      editForm = {
        slug: detail.slug,
        title: detail.title,
        excerpt: detail.excerpt,
        category: detail.category,
        title_en: detail.title_en ?? "",
        excerpt_en: detail.excerpt_en ?? "",
        category_en: detail.category_en ?? "",
        read_time: detail.read_time,
        cover: detail.cover,
        cover_image_url: detail.cover_image_url,
        published_at: detail.published_at,
        contentText: detail.content.join("\n\n"),
        contentTextEn: detail.content_en ? detail.content_en.join("\n\n") : "",
      };
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleSave(article: BlogArticle, event: SubmitEvent) {
    event.preventDefault();
    try {
      await updateArticle(article.id, {
        slug: editForm.slug,
        title: editForm.title,
        excerpt: editForm.excerpt,
        category: editForm.category,
        title_en: editForm.title_en || undefined,
        excerpt_en: editForm.excerpt_en || undefined,
        category_en: editForm.category_en || undefined,
        read_time: editForm.read_time,
        cover: editForm.cover,
        cover_image_url: editForm.cover_image_url,
        published_at: editForm.published_at,
        content: splitContent(editForm.contentText),
        content_en: editForm.contentTextEn ? splitContent(editForm.contentTextEn) : undefined,
        is_active: article.is_active,
      });
      editingId = null;
      snackbar.success("Article mis à jour.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleToggleActive(article: BlogArticle) {
    try {
      const detail = await adminGetArticle(article.id);
      await updateArticle(article.id, {
        slug: detail.slug,
        title: detail.title,
        excerpt: detail.excerpt,
        category: detail.category,
        title_en: detail.title_en ?? undefined,
        excerpt_en: detail.excerpt_en ?? undefined,
        category_en: detail.category_en ?? undefined,
        read_time: detail.read_time,
        cover: detail.cover,
        cover_image_url: detail.cover_image_url,
        published_at: detail.published_at,
        content: detail.content,
        content_en: detail.content_en ?? undefined,
        is_active: !article.is_active,
      });
      snackbar.success(article.is_active ? "Article dépublié." : "Article publié.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await deleteArticle(id);
      snackbar.success("Article supprimé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
</script>

<div class="blog-admin-page">
  <div class="page-header">
    <p class="header-desc">Articles du blog public. Un article dépublié reste en base mais disparaît du site.</p>
    <button class="btn-add" onclick={() => (showNewForm = !showNewForm)}>
      <Plus size={16} />
      Nouvel article
    </button>
  </div>

  {#if showNewForm}
    <div class="form-card">
      <h3>Créer un article</h3>
      <form onsubmit={handleCreate}>
        <div class="form-grid">
          <div class="field">
            <label for="new-title">Titre (FR)</label>
            <input id="new-title" bind:value={newForm.title} required />
          </div>
          <div class="field">
            <label for="new-slug">Slug (URL)</label>
            <input id="new-slug" placeholder="ex: mon-article" bind:value={newForm.slug} required />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="new-category">Catégorie (FR)</label>
            <input id="new-category" placeholder="ex: Pédagogie" bind:value={newForm.category} required />
          </div>
          <div class="field">
            <label for="new-date">Date de publication</label>
            <input id="new-date" type="date" bind:value={newForm.published_at} required />
          </div>
          <div class="field">
            <label for="new-readtime">Temps de lecture</label>
            <input id="new-readtime" placeholder="ex: 4 min" bind:value={newForm.read_time} required />
          </div>
          <div class="field">
            <label for="new-cover">Couverture</label>
            <select id="new-cover" bind:value={newForm.cover}>
              <option value="green">Vert</option>
              <option value="gold">Or</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="new-excerpt">Extrait (FR)</label>
          <input id="new-excerpt" bind:value={newForm.excerpt} required />
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="new-title-en">Title (EN)</label>
            <input id="new-title-en" bind:value={newForm.title_en} />
          </div>
          <div class="field">
            <label for="new-category-en">Category (EN)</label>
            <input id="new-category-en" placeholder="e.g. Pedagogy" bind:value={newForm.category_en} />
          </div>
        </div>
        <div class="field">
          <label for="new-excerpt-en">Excerpt (EN)</label>
          <input id="new-excerpt-en" bind:value={newForm.excerpt_en} />
        </div>
        <div class="field">
          <span class="field-label">Image de couverture (optionnel)</span>
          {#if newForm.cover_image_url}
            <div class="image-preview">
              <img src={newForm.cover_image_url} alt="Couverture" />
              <button type="button" class="btn-remove-image" onclick={() => (newForm.cover_image_url = null)} title="Retirer l'image">
                <X size={13} />
              </button>
            </div>
          {:else}
            <label class="upload-dropzone" class:disabled={uploadingNew}>
              {#if uploadingNew}
                <Loader size={18} class="spin" />
                <span>Envoi en cours...</span>
              {:else}
                <ImagePlus size={18} />
                <span>Choisir une image (JPEG, PNG, WEBP)</span>
              {/if}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingNew} onchange={(e) => handleImageSelect(e, "new")} />
            </label>
          {/if}
        </div>
        <div class="field">
          <label for="new-content">Contenu (FR) — un paragraphe par bloc, séparés par une ligne vide</label>
          <textarea id="new-content" rows="8" bind:value={newForm.contentText} required></textarea>
        </div>
        <div class="field">
          <label for="new-content-en">Content (EN) — one paragraph per block, separated by a blank line</label>
          <textarea id="new-content-en" rows="8" bind:value={newForm.contentTextEn}></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-primary-sm" type="submit">Créer</button>
          <button class="btn-cancel" type="button" onclick={() => (showNewForm = false)}>Annuler</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">Chargement...</div>
  {:else if articles.length === 0}
    <div class="empty-state">Aucun article créé.</div>
  {:else}
    <div class="table-wrap">
      <table class="articles-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Catégorie</th>
            <th>Publié le</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each articles as article}
            <tr class:inactive-row={!article.is_active}>
              <td>
                <div class="article-cell">
                  {#if article.cover_image_url}
                    <img class="article-thumb" src={article.cover_image_url} alt="" />
                  {:else}
                    <span class="article-thumb placeholder" class:gold={article.cover === "gold"}></span>
                  {/if}
                  <div>
                    <span class="article-title">{article.title}</span>
                    <span class="article-slug">/blog/{article.slug}</span>
                  </div>
                </div>
              </td>
              <td>{article.category}</td>
              <td>{formatDate(article.published_at)}</td>
              <td>
                <span class="status-pill" class:active={article.is_active}>{article.is_active ? "Publié" : "Dépublié"}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon" title="Modifier" onclick={() => startEdit(article)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    class="btn-icon"
                    title={article.is_active ? "Dépublier (masquer du site)" : "Publier (afficher sur le site)"}
                    onclick={() => handleToggleActive(article)}
                  >
                    {#if article.is_active}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
                  </button>
                  <button class="btn-icon danger" title="Supprimer" onclick={() => handleDelete(article.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>

            {#if editingId === article.id}
              <tr class="detail-row">
                <td colspan="5">
                  <form class="edit-form" onsubmit={(e) => handleSave(article, e)}>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-title-{article.id}">Titre (FR)</label>
                        <input id="edit-title-{article.id}" bind:value={editForm.title} required />
                      </div>
                      <div class="field">
                        <label for="edit-slug-{article.id}">Slug (URL)</label>
                        <input id="edit-slug-{article.id}" bind:value={editForm.slug} required />
                      </div>
                    </div>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-category-{article.id}">Catégorie (FR)</label>
                        <input id="edit-category-{article.id}" bind:value={editForm.category} required />
                      </div>
                      <div class="field">
                        <label for="edit-date-{article.id}">Date de publication</label>
                        <input id="edit-date-{article.id}" type="date" bind:value={editForm.published_at} required />
                      </div>
                      <div class="field">
                        <label for="edit-readtime-{article.id}">Temps de lecture</label>
                        <input id="edit-readtime-{article.id}" bind:value={editForm.read_time} required />
                      </div>
                      <div class="field">
                        <label for="edit-cover-{article.id}">Couverture</label>
                        <select id="edit-cover-{article.id}" bind:value={editForm.cover}>
                          <option value="green">Vert</option>
                          <option value="gold">Or</option>
                        </select>
                      </div>
                    </div>
                    <div class="field">
                      <label for="edit-excerpt-{article.id}">Extrait (FR)</label>
                      <input id="edit-excerpt-{article.id}" bind:value={editForm.excerpt} required />
                    </div>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-title-en-{article.id}">Title (EN)</label>
                        <input id="edit-title-en-{article.id}" bind:value={editForm.title_en} />
                      </div>
                      <div class="field">
                        <label for="edit-category-en-{article.id}">Category (EN)</label>
                        <input id="edit-category-en-{article.id}" bind:value={editForm.category_en} />
                      </div>
                    </div>
                    <div class="field">
                      <label for="edit-excerpt-en-{article.id}">Excerpt (EN)</label>
                      <input id="edit-excerpt-en-{article.id}" bind:value={editForm.excerpt_en} />
                    </div>
                    <div class="field">
                      <span class="field-label">Image de couverture (optionnel)</span>
                      {#if editForm.cover_image_url}
                        <div class="image-preview">
                          <img src={editForm.cover_image_url} alt="Couverture" />
                          <button type="button" class="btn-remove-image" onclick={() => (editForm.cover_image_url = null)} title="Retirer l'image">
                            <X size={13} />
                          </button>
                        </div>
                      {:else}
                        <label class="upload-dropzone" class:disabled={uploadingEdit}>
                          {#if uploadingEdit}
                            <Loader size={18} class="spin" />
                            <span>Envoi en cours...</span>
                          {:else}
                            <ImagePlus size={18} />
                            <span>Choisir une image (JPEG, PNG, WEBP)</span>
                          {/if}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingEdit} onchange={(e) => handleImageSelect(e, "edit")} />
                        </label>
                      {/if}
                    </div>
                    <div class="field">
                      <label for="edit-content-{article.id}">Contenu (FR) — un paragraphe par bloc, séparés par une ligne vide</label>
                      <textarea id="edit-content-{article.id}" rows="8" bind:value={editForm.contentText} required></textarea>
                    </div>
                    <div class="field">
                      <label for="edit-content-en-{article.id}">Content (EN) — one paragraph per block, separated by a blank line</label>
                      <textarea id="edit-content-en-{article.id}" rows="8" bind:value={editForm.contentTextEn}></textarea>
                    </div>
                    <div class="form-actions">
                      <button class="btn-primary-sm" type="submit">Enregistrer</button>
                      <button class="btn-cancel" type="button" onclick={() => (editingId = null)}>Annuler</button>
                    </div>
                  </form>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .blog-admin-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; }
  .btn-add { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; flex-shrink: 0; }
  .btn-add:hover { background: #028a15; }
  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
  .form-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 1rem; }
  .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
  label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  input, select, textarea { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #f9fafb; color: #111827; transition: all 0.15s; }
  textarea { resize: vertical; line-height: 1.5; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1); }
  .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .btn-primary-sm { padding: 0.5rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .btn-cancel { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #374151; font-family: inherit; font-weight: 600; font-size: 0.82rem; cursor: pointer; }

  .field-label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  .upload-dropzone {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 1rem; border: 1.5px dashed #d1d5db; border-radius: 8px; background: #f9fafb;
    color: #6b7280; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .upload-dropzone:hover { border-color: #03a71a; color: #028a15; background: #f0fdf4; }
  .upload-dropzone.disabled { cursor: wait; opacity: 0.7; }
  .upload-dropzone input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; padding: 0; border: 0; }
  :global(.upload-dropzone .spin) { animation: blog-spin 1s linear infinite; }
  @keyframes blog-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .image-preview { position: relative; display: inline-block; width: fit-content; }
  .image-preview img { display: block; max-width: 220px; max-height: 140px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: cover; }
  .btn-remove-image {
    position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%;
    border: 1px solid #e5e7eb; background: #fff; color: #dc2626; display: flex; align-items: center;
    justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .btn-remove-image:hover { background: #fef2f2; }

  .article-cell { display: flex; align-items: center; gap: 0.6rem; }
  .article-thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
  .article-thumb.placeholder { background: linear-gradient(135deg, #03a71a, #028a15); }
  .article-thumb.placeholder.gold { background: linear-gradient(135deg, #fec600, #d97706); }

  .table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; overflow-x: auto; }
  .articles-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .articles-table th { text-align: left; padding: 0.75rem 1rem; background: #f9fafb; color: #6b7280; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
  .articles-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  .articles-table tr.inactive-row td { opacity: 0.55; }
  .article-title { display: block; font-weight: 700; color: #111827; }
  .article-slug { display: block; font-size: 0.72rem; color: #9ca3af; font-weight: 600; }
  .status-pill { display: inline-flex; font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
  .status-pill.active { background: #ecfdf5; color: #047857; }
  .row-actions { display: flex; align-items: center; gap: 0.3rem; }
  .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; border-radius: 7px; background: #f3f4f6; color: #4b5563; cursor: pointer; transition: all 0.15s; }
  .btn-icon:hover { background: #e5e7eb; color: #111827; }
  .btn-icon.danger:hover { background: #fef2f2; color: #dc2626; }
  .detail-row td { background: #fafbfa; border-bottom: 2px solid #03a71a; padding: 1.25rem; }
  .edit-form { margin: 0; }
  .loading-state, .empty-state { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; }
  @media (max-width: 900px) { .form-grid { grid-template-columns: 1fr; } }
</style>
