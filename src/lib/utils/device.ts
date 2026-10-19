/**
 * Jeton d'appareil de confiance (un par role), emis apres une verification
 * reussie quand l'utilisateur coche "faire confiance a cet appareil". Le
 * serveur n'en garde que l'empreinte et peut le revoquer (changement de mot
 * de passe). Stockage local : si le navigateur est vide, un code est simplement
 * redemande.
 */
import { browser } from "$app/environment";

const key = (role: string) => `academy_device_${role}`;

export function getDeviceToken(role: string): string | null {
  if (!browser) return null;
  try {
    return localStorage.getItem(key(role));
  } catch {
    return null;
  }
}

export function setDeviceToken(role: string, token: string | null | undefined) {
  if (!browser || !token) return;
  try {
    localStorage.setItem(key(role), token);
  } catch {
    // stockage indisponible (navigation privee) : sans consequence
  }
}
