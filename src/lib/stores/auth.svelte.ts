import { browser } from "$app/environment";

export type Role = "apprenant" | "admin" | "client";

export interface Profile {
  firstname: string;
  lastname: string;
}

interface StoredSession {
  token: string;
  role: Role;
  profile?: Profile | null;
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
  profile = $state<Profile | null>(null);

  constructor() {
    const session = loadSession();
    if (session) {
      this.token = session.token;
      this.role = session.role;
      this.profile = session.profile ?? null;
    }
  }

  login(token: string, role: Role) {
    this.token = token;
    this.role = role;
    this.profile = null;
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role }));
    }
  }

  setProfile(profile: Profile) {
    this.profile = profile;
    if (browser && this.token && this.role) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this.token, role: this.role, profile }));
    }
  }

  logout() {
    this.token = null;
    this.role = null;
    this.profile = null;
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  get isAuthenticated() {
    return this.token !== null;
  }
}

export const auth = new AuthStore();
