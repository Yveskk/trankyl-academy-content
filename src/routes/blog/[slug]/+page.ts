import { error } from "@sveltejs/kit";
import { ApiError } from "$lib/api/client";
import { getArticle } from "$lib/api/blog";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  try {
    const article = await getArticle(params.slug);
    return { article };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      error(404, "Article introuvable");
    }
    error(500, "Impossible de contacter le serveur Trankyl Academy.");
  }
};
