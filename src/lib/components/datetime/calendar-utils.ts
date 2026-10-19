/** Utilitaires de dates du selecteur : tout est manipule en chaines locales « AAAA-MM-JJ » (jamais d'UTC, donc pas de decalage d'un jour). */

export const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => toIso(new Date());

/** « 2026-10-09 » (ou « 2026-10-09T16:00 ») -> Date locale a midi ; null si invalide. */
export function fromIso(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(iso: string, n: number): string {
  const d = fromIso(iso) ?? new Date();
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Ajoute des mois en gardant le jour (ramene au dernier jour du mois si besoin : 31 janv. + 1 mois = 28/29 fev.). */
export function addMonths(iso: string, n: number): string {
  const d = fromIso(iso) ?? new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toIso(d);
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export const clamp = (iso: string, min?: string, max?: string) => (min && iso < min ? min : max && iso > max ? max : iso);

/** Cases d'un mois : decalage (lundi = 0) puis les jours. */
export function monthDays(year: number, month: number): { lead: number; days: string[] } {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return { lead, days: Array.from({ length: count }, (_, i) => toIso(new Date(year, month, i + 1, 12))) };
}

export function weekdayLabels(locale: string): string[] {
  const f = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { weekday: "short" });
  // 5 janvier 2026 = un lundi
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 0, 5 + i, 12)).replace(".", "").slice(0, 3));
}
export function monthName(month: number, locale: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { month: style }).format(new Date(2026, month, 1, 12));
}
export function formatDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }): string {
  const d = fromIso(iso);
  return d ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", opts).format(d) : "";
}
