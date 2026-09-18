<script lang="ts">
  import { onMount } from "svelte";
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
    title: "",
    excerpt: "",
    category: "",
    cover_image_url: null as string | null,
    event_start_date: "",
    event_end_date: "",
    contentText: "",
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

  onMount(() => {
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
        title: newForm.title,
        excerpt: newForm.excerpt,
        category: newForm.category || null,
        cover_image_url: newForm.cover_image_url,
        event_start_date: newForm.event_start_date || null,
        event_end_date: newForm.event_end_date || null,
        content: splitContent(newForm.contentText),
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
        title: detail.title ?? "",
        excerpt: detail.excerpt ?? "",
        category: detail.category ?? "",
        cover_image_url: detail.cover_image_url,
        event_start_date: detail.event_start_date ?? "",
        event_end_date: detail.event_end_date ?? "",
        contentText: detail.content.join("\n\n"),
      };
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleSave(article: BlogArticle, event: SubmitEvent) {
    event.preventDefault();
    try {
      await updateArticle(article.id, {
        title: editForm.title,
        excerpt: editForm.excerpt,
        category: editForm.category || null,
        cover_image_url: editForm.cover_image_url,
        event_start_date: editForm.event_start_date || null,
        event_end_date: editForm.event_end_date || null,
        content: splitContent(editForm.contentText),
        is_active: article.is_active ?? true,
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
        title: detail.title ?? "",
        excerpt: detail.excerpt ?? "",
        category: detail.category,
        cover_image_url: detail.cover_image_url,
        event_start_date: detail.event_start_date,
        event_end_date: detail.event_end_date,
        content: detail.content,
        is_active: !article.is_active,
      });
      snackbar.success(article.is_active ? "Article dépublié." : "Article publié.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cet article ? Il s'agit d'un evenement de la table partagee Trankyl, egalement visible du site principal.")) return;
    try {
      await deleteArticle(id);
      snackbar.success("Article supprimé.");
      await refresh();
    } catch (e) {
      snackbar.error((e as Error).message);
    }
  }

  function formatDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
  }
</script>

<div class="blog-admin-page">
  <div class="page-header">
    <p class="header-desc">
      Articles du blog public — table `events`, partagee avec le site principal Trankyl. Un article dépublié reste en base mais disparaît des deux sites.
    </p>
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
            <label for="new-title">Titre</label>
            <input id="new-title" bind:value={newForm.title} required />
          </div>
          <div class="field">
            <label for="new-category">Catégorie (optionnel)</label>
            <input id="new-category" placeholder="ex: Challenge Trankyl" bind:value={newForm.category} />
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="new-start">Date de début</label>
            <input id="new-start" type="date" bind:value={newForm.event_start_date} required />
          </div>
          <div class="field">
            <label for="new-end">Date de fin (optionnel)</label>
            <input id="new-end" type="date" bind:value={newForm.event_end_date} />
          </div>
        </div>
        <div class="field">
          <label for="new-excerpt">Extrait</label>
          <input id="new-excerpt" bind:value={newForm.excerpt} required />
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
          <label for="new-content">Contenu — un paragraphe par bloc, séparés par une ligne vide</label>
          <textarea id="new-content" rows="8" bind:value={newForm.contentText} required></textarea>
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
                  {#if article.cover_image_url && article.cover_image_url.startsWith("http")}
                    <img class="article-thumb" src={article.cover_image_url} alt="" />
                  {:else}
                    <span class="article-thumb placeholder"></span>
                  {/if}
                  <div>
                    <span class="article-title">{article.title}</span>
                    <span class="article-slug">/blog/{article.id}</span>
                  </div>
                </div>
              </td>
              <td>{article.category ?? "—"}</td>
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
                        <label for="edit-title-{article.id}">Titre</label>
                        <input id="edit-title-{article.id}" bind:value={editForm.title} required />
                      </div>
                      <div class="field">
                        <label for="edit-category-{article.id}">Catégorie (optionnel)</label>
                        <input id="edit-category-{article.id}" bind:value={editForm.category} />
                      </div>
                    </div>
                    <div class="form-grid">
                      <div class="field">
                        <label for="edit-start-{article.id}">Date de début</label>
                        <input id="edit-start-{article.id}" type="date" bind:value={editForm.event_start_date} required />
                      </div>
                      <div class="field">
                        <label for="edit-end-{article.id}">Date de fin (optionnel)</label>
                        <input id="edit-end-{article.id}" type="date" bind:value={editForm.event_end_date} />
                      </div>
                    </div>
                    <div class="field">
                      <label for="edit-excerpt-{article.id}">Extrait</label>
                      <input id="edit-excerpt-{article.id}" bind:value={editForm.excerpt} required />
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
                      <label for="edit-content-{article.id}">Contenu — un paragraphe par bloc, séparés par une ligne vide</label>
                      <textarea id="edit-content-{article.id}" rows="8" bind:value={editForm.contentText} required></textarea>
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
  .header-desc { font-size: 0.85rem; color: #6b7280; margin: 0; max-width: 620px; }
  .btn-add { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border: none; border-radius: 8px; background: #03a71a; color: #fff; font-family: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; flex-shrink: 0; }
  .btn-add:hover { background: #028a15; }
  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
  .form-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 1rem; }
  .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
  label { font-size: 0.78rem; font-weight: 600; color: #374151; }
  input, textarea { font-family: inherit; font-size: 0.88rem; padding: 0.55rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; background: #f9fafb; color: #111827; transition: all 0.15s; }
  textarea { resize: vertical; line-height: 1.5; }
  input:focus, textarea:focus { outline: none; border-color: #03a71a; box-shadow: 0 0 0 2px rgba(3, 167, 26, 0.1); }
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
