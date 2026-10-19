/** Deplace le noeud dans <body> : la bulle du calendrier n'est ainsi jamais rognee par une modale ou un conteneur defilant. */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return { destroy: () => node.remove() };
}
