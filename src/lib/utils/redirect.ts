/** Destination de retour apres connexion : chemins relatifs du site uniquement (jamais d'URL externe). */
export function safeRedirect(value: string | null | undefined, fallback = "/prestataires"): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
