<script lang="ts">
  import { onMount } from "svelte";
  import "leaflet/dist/leaflet.css";

  // Carte OpenStreetMap (sans cle) : montre la position du prestataire ; on peut déplacer le repère ou cliquer pour la corriger.
  let {
    lat = null,
    lng = null,
    onmove,
  }: { lat: number | null; lng: number | null; onmove: (lat: number, lng: number) => void } = $props();

  let el = $state<HTMLDivElement | undefined>();
  let map: import("leaflet").Map | null = null;
  let marker: import("leaflet").Marker | null = null;
  let L: typeof import("leaflet") | null = null;
  const DEFAULT = { lat: 6.1725, lng: 1.2314, zoom: 12 }; // Lomé, tant qu'aucune position n'est donnée

  function pin(lt: number, lg: number) {
    if (!L || !map) return;
    if (!marker) {
      marker = L.marker([lt, lg], {
        draggable: true,
        icon: L.divIcon({ className: "pm-pin", html: "<span></span>", iconSize: [28, 38], iconAnchor: [14, 36] }),
      }).addTo(map);
      marker.on("dragend", () => {
        const p = marker!.getLatLng();
        onmove(Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7)));
      });
    } else marker.setLatLng([lt, lg]);
  }

  onMount(() => {
    let alive = true;
    (async () => {
      L = (await import("leaflet")).default ?? (await import("leaflet"));
      if (!alive || !el) return;
      map = L.map(el, { scrollWheelZoom: false }).setView(lat !== null && lng !== null ? [lat, lng] : [DEFAULT.lat, DEFAULT.lng], lat !== null ? 16 : DEFAULT.zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      if (lat !== null && lng !== null) pin(lat, lng);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        pin(e.latlng.lat, e.latlng.lng);
        onmove(Number(e.latlng.lat.toFixed(7)), Number(e.latlng.lng.toFixed(7)));
      });
      setTimeout(() => map?.invalidateSize(), 200);
    })();
    return () => {
      alive = false;
      map?.remove();
      map = null;
      marker = null;
    };
  });

  // Position mise à jour depuis l'extérieur (GPS, lien Google Maps) : le repère et la vue suivent.
  $effect(() => {
    const lt = lat;
    const lg = lng;
    if (!map || lt === null || lg === null) return;
    pin(lt, lg);
    map.setView([lt, lg], Math.max(map.getZoom(), 16));
  });
</script>

<div class="pm" bind:this={el} role="application" aria-label="Carte de votre position"></div>

<style>
  .pm { height: 17rem; border-radius: 14px; overflow: hidden; border: 1px solid #d6d9df; z-index: 0; }
  :global(.pm-pin span) { display: block; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; background: #ffc72c; border: 3px solid #1d2230; transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35); }
  :global(.pm-pin span::after) { content: ""; position: absolute; top: 7px; left: 7px; width: 8px; height: 8px; border-radius: 50%; background: #1d2230; }
</style>
