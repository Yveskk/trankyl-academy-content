import { error } from "@sveltejs/kit";
import { getArticle } from "$lib/content/blog";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
  const article = getArticle(params.slug);
  if (!article) {
    error(404, "Article introuvable");
  }
  return { article };
};
