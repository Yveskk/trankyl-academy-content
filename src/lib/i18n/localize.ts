import { i18n } from "$lib/stores/locale.svelte";

/**
 * Choisit le texte anglais si la langue active est "en" ET qu'une traduction
 * a ete saisie par l'admin, sinon retombe toujours sur le francais. Utilise
 * pour tout le contenu venant du backend (taxonomie, blog, sections
 * editoriales) — contrairement aux textes statiques de l'interface, geres
 * par le dictionnaire i18n habituel.
 */
export function localize(fr: string, en: string | null | undefined): string {
  return i18n.locale === "en" && en ? en : fr;
}

/** Variante pour un tableau de paragraphes (contenu d'article de blog). */
export function localizeList(fr: string[], en: string[] | null | undefined): string[] {
  return i18n.locale === "en" && en && en.length > 0 ? en : fr;
}
