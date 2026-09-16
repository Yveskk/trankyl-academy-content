import { PUBLIC_USE_MOCK_DATA } from "$env/static/public";

// Mode demo hors-ligne : les fichiers src/lib/api/*.ts servent des donnees
// statiques (src/lib/mock/data.ts) au lieu d'appeler trankyl-academy-engine.
export const USE_MOCK_DATA = PUBLIC_USE_MOCK_DATA === "true";
