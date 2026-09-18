import { error } from "@sveltejs/kit";
import { ApiError } from "$lib/api/client";
import { getArticle } from "$lib/api/blog";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    error(404, "Article introuvable");
  }
  try {
    const article = await getArticle(id);
    return { article };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      error(404, "Article introuvable");
    }
    error(500, "Impossible de contacter le serveur Trankyl Academy.");
  }
};
