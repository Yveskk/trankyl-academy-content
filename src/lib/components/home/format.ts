import { i18n } from "$lib/stores/locale.svelte";

/** 4.9 -> "4,9" (fr) / "4.9" (en). */
export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(i18n.locale === "en" ? "en-US" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const AVATAR_TONES = ["yellow", "green", "grey", "gold"] as const;

/** Libelle "212 missions" / "212 jobs" avec le bon pluriel. */
export function missionsLabel(n: number): string {
  if (i18n.locale === "en") return `${n} ${n === 1 ? "job" : "jobs"}`;
  return `${n} mission${n > 1 ? "s" : ""}`;
}
