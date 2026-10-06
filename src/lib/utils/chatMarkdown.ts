function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeButtonUrl(url: string): boolean {
  // N'autorise que les liens internes ou http(s) explicites — bloque
  // javascript:/data: et autres schemas exploitables dans un onclick.
  return /^\//.test(url) || /^https?:\/\//i.test(url);
}

/**
 * Rendu mini-markdown pour les messages de chat IA (SITA). Le
 * message peut venir d'un utilisateur (son propre texte) ou de l'IA, qui
 * peut elle-meme citer des donnees issues de la base (nom d'un apprenant,
 * description d'un metier...). On echappe TOUJOURS le HTML en premier avant
 * d'appliquer le mini-markdown, pour eviter une injection XSS stockee via
 * {@html} au point d'appel.
 *
 * Un bouton [btn:label:action:xxx] (au lieu d'une URL) rend un element avec
 * `data-chat-action="xxx"` et `href="#"` plutot qu'un lien de navigation —
 * a la charge du composant appelant d'ecouter les clics sur
 * `[data-chat-action]` (delegation d'evenements, puisque ce HTML est injecte
 * via {@html} et n'a pas de gestionnaire Svelte natif) pour declencher une
 * action en place (ex: demander une connexion avant de continuer la
 * conversation) plutot que de naviguer.
 */
export function renderChatMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\[btn:(.+?):(.+?)\]/g, (_match, label: string, target: string) => {
      if (target.startsWith("action:")) {
        const action = target.slice("action:".length);
        return `<a href="#" class="chat-btn" data-chat-action="${action}">${label}</a>`;
      }
      return isSafeButtonUrl(target) ? `<a href="${target}" class="chat-btn">${label}</a>` : label;
    })
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
