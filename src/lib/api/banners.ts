import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { apiLoading } from "$lib/stores/loading.svelte";
import { ApiError, api } from "./client";
import type { Banner } from "./types";

export function listBanners() {
  return api.get<Banner[]>("/banners");
}

export function adminListBanners() {
  return api.get<Banner[]>("/banners/admin");
}

export function createBanner(payload: { ordre: number; image_url: string; image_url_mobile?: string | null }) {
  return api.post<Banner>("/banners", payload);
}

export function updateBanner(
  id: number,
  payload: { ordre: number; image_url: string; image_url_mobile?: string | null; is_active: boolean }
) {
  return api.put<Banner>(`/banners/${id}`, payload);
}

export function deleteBanner(id: number) {
  return api.delete(`/banners/${id}`);
}

export async function uploadBannerImage(file: File): Promise<{ url: string }> {
  apiLoading.start();
  try {
    const formData = new FormData();
    formData.append("file", file);

    const headers = new Headers();
    if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);

    const res = await fetch(`${PUBLIC_API_URL}/banners/admin/upload-image`, {
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
