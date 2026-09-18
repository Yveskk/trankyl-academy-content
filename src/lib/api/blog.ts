import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { apiLoading } from "$lib/stores/loading.svelte";
import { ApiError, api } from "./client";
import type { BlogArticle, BlogArticleDetail } from "./types";

export interface BlogArticlePayload {
  title: string;
  excerpt: string;
  category: string | null;
  cover_image_url: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  content: string[];
}

export async function uploadCoverImage(file: File): Promise<{ url: string }> {
  apiLoading.start();
  try {
    const formData = new FormData();
    formData.append("file", file);

    const headers = new Headers();
    if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);

    const res = await fetch(`${PUBLIC_API_URL}/blog/admin/upload-image`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail ?? detail;
      } catch {
        // pas de corps JSON exploitable
      }
      throw new ApiError(res.status, detail);
    }
    return res.json();
  } finally {
    apiLoading.stop();
  }
}

export function listArticles() {
  return api.get<BlogArticle[]>("/blog/articles");
}

export function getArticle(id: number) {
  return api.get<BlogArticleDetail>(`/blog/articles/${id}`);
}

export function adminListArticles() {
  return api.get<BlogArticle[]>("/blog/admin/articles");
}

export function adminGetArticle(id: number) {
  return api.get<BlogArticleDetail>(`/blog/admin/articles/${id}`);
}

export function createArticle(payload: BlogArticlePayload) {
  return api.post<BlogArticleDetail>("/blog/articles", payload);
}

export function updateArticle(id: number, payload: BlogArticlePayload & { is_active: boolean }) {
  return api.put<BlogArticleDetail>(`/blog/articles/${id}`, payload);
}

export function deleteArticle(id: number) {
  return api.delete(`/blog/articles/${id}`);
}
