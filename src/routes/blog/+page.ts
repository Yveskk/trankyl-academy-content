import { listArticles } from "$lib/api/blog";
import type { BlogArticle } from "$lib/api/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  let articles: BlogArticle[] = [];
  let apiError: string | null = null;
  try {
    articles = await listArticles();
  } catch {
    apiError = "Impossible de contacter le serveur Trankyl Academy. Verifiez que l'API est demarree.";
  }
  return { articles, apiError };
};
