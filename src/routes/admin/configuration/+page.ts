import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Une seule rubrique pour l'instant : on y va directement.
export const load: PageLoad = () => {
  redirect(307, "/admin/configuration/pays");
};
