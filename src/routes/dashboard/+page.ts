import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Ancienne adresse du tableau de bord apprenant : l'espace vit maintenant sur /apprenant.
export const load: PageLoad = () => {
  redirect(308, "/apprenant");
};
