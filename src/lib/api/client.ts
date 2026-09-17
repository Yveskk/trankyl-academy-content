import { PUBLIC_API_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";
import { apiLoading } from "$lib/stores/loading.svelte";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  apiLoading.start();
  try {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (auth.token) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    }

    const res = await fetch(`${PUBLIC_API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
        // reponse sans corps JSON exploitable
      }
      throw new ApiError(res.status, detail);
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  } finally {
    apiLoading.stop();
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
