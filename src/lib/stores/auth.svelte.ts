import { browser } from "$app/environment";

export type Role = "apprenant" | "admin";

interface StoredSession {
  token: string;
  role: Role;
}

const STORAGE_KEY = "academy_session";

function loadSession(): StoredSession | null {
  if (!browser) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

class AuthStore {
  token = $state<string | null>(null);
  role = $state<Role | null>(null);

  constructor() {
    const session = loadSession();
    if (session) {
      this.token = session.token;
      this.role = session.role;
    }
  }

  login(token: string, role: Role) {
    this.token = token;
    this.role = role;
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role }));
    }
  }

  logout() {
    this.token = null;
    this.role = null;
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  get isAuthenticated() {
    return this.token !== null;
  }
}

export const auth = new AuthStore();
