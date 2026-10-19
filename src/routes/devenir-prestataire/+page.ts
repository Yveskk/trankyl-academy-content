import { browser } from "$app/environment";
import { getHome, type HeroSlide, type HomeSection } from "$lib/api/home";
import { i18n } from "$lib/stores/locale.svelte";
import { site } from "$lib/stores/site.svelte";
import type { PageLoad } from "./$types";

// Affiches publiees depuis l'admin (Affiches d'accueil) pour l'espace prestataire.
// Une erreur reseau ne bloque jamais la page : on retombe sur les cartes par defaut.
// Visuels de TEST : affiches de secours tant qu'aucune n'est publiee pour les prestataires
// (Admin > Affiches > "Publier sur" = Page Devenir prestataire). Elles disparaissent des qu'une vraie est en ligne.
const TEST_SLIDES: HeroSlide[] = [
  { id: "test-plomberie", image_url: "/test-banners/plomberie.svg", image_url_mobile: null, title: "Plomberie", subtitle: null, cta_label: null, link_url: null, audience: "prestataire" },
  { id: "test-electricite", image_url: "/test-banners/electricite.svg", image_url_mobile: null, title: "Électricité", subtitle: null, cta_label: null, link_url: null, audience: "prestataire" },
  { id: "test-menage", image_url: "/test-banners/menage.svg", image_url_mobile: null, title: "Ménage & entretien", subtitle: null, cta_label: null, link_url: null, audience: "prestataire" },
];

export const load: PageLoad = async ({ fetch, parent }) => {
  const layout = await parent();
  const lang = browser ? i18n.locale : layout.locale;
  const country = browser ? site.country : layout.country;
  try {
    const home = await getHome(lang as "fr" | "en", country, fetch);
    const section: HomeSection | null = home.sections.hero_slides ?? null;
    const slides: HeroSlide[] = (section?.data?.slides ?? []).filter((s) => s.audience === "prestataire" || s.audience === "both");
    return { slides: slides.length > 0 ? slides : TEST_SLIDES, slideSettings: section?.payload ?? {} };
  } catch {
    return { slides: TEST_SLIDES, slideSettings: {} as Record<string, any> };
  }
};
