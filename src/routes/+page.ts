import { listArticles } from "$lib/api/blog";
import { getSection } from "$lib/api/content";
import { listMetiers } from "$lib/api/taxonomy";
import type { BlogArticle, ContentSection, Metier } from "$lib/api/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  let metiers: Metier[] = [];
  let apiError: string | null = null;

  try {
    metiers = await listMetiers();
  } catch {
    apiError = "Impossible de contacter le serveur Trankyl Academy. Verifiez que l'API est demarree.";
  }

  // Section editoriale geree depuis l'admin : absente ou desactivee -> on
  // masque simplement le bloc, ce n'est jamais une erreur bloquante.
  let section: ContentSection | null = null;
  try {
    section = await getSection("home_careers");
  } catch {
    section = null;
  }

  let articles: BlogArticle[] = [];
  try {
    articles = await listArticles();
  } catch {
    articles = [];
  }

  return { metiers, apiError, section, articles };
};
