/**
 * Chargement paresseux de Leaflet (carte OpenStreetMap) depuis un CDN, a la
 * demande : aucune dependance npm, et rien n'est telecharge tant qu'une
 * carte n'est pas affichee.
 */
const VERSION = "1.9.4";
const BASE = `https://unpkg.com/leaflet@${VERSION}/dist`;

let loading: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("navigateur requis"));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${BASE}/leaflet.css`;
      css.dataset.leaflet = "1";
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = `${BASE}/leaflet.js`;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = () => {
      loading = null;
      reject(new Error("Impossible de charger la carte"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = "&copy; OpenStreetMap";
