import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    // @lucide/svelte expose ses icones comme fichiers .svelte bruts (imports
    // profonds type @lucide/svelte/icons/xxx). Sans ca, le serveur peut
    // tenter de les charger nativement via Node au lieu de les faire passer
    // par le plugin Svelte, d'ou l'erreur "Unknown file extension .svelte".
    noExternal: ["@lucide/svelte"],
  },
});
