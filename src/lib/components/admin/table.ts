import type { Snippet } from "svelte";

/** Colonne de `DataTable` : `key` (champ affiche tel quel) ou `cell` (snippet pour un rendu libre). */
export interface Column<R> {
  key: string;
  label: string;
  /** Largeur CSS (ex. "14rem") ; sinon la colonne se partage la place restante. */
  width?: string;
  align?: "left" | "right" | "center";
  cell?: Snippet<[R]>;
  /** Masquee sous 900 px de large (colonnes secondaires). */
  hideOnSmall?: boolean;
}
