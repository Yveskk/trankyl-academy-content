import type { LayoutServerLoad } from "./$types";

// Pays et langue memorises par le visiteur (cookies) : le rendu serveur part dans le bon pays des la premiere reponse.
export const load: LayoutServerLoad = ({ cookies }) => {
  const country = cookies.get("academy_country");
  const locale = cookies.get("academy_locale");
  return {
    country: country && /^[A-Z]{2}$/.test(country) ? country : "TG",
    locale: locale === "en" ? "en" : "fr",
  };
};
