import { browser } from "$app/environment";

export type Role = "apprenant" | "admin" | "client";

export interface Profile {
  firstname: string;
  lastname: string;
  image?: string | null;
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

export interface AdminInfo {
  id: number;
  firstname: string;
  lastname: string | null;
  email: string;
  role: { id: number; name: string } | null;
  is_super: boolean;
  permissions: string[];
  mfa_enabled: boolean;
  recovery_left: number;
  all_countries: boolean;
  countries: { code: string; name: string; name_en: string | null }[];
  default_country: string | null;
}

class AuthStore {
  /** Profil et droits de l'administrateur connecte (charges par /auth/admin/me). */
  admin = $state<AdminInfo | null>(null);
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

  /** Le super-administrateur a tout ; sinon la permission doit figurer dans son role. */
  can(key: string): boolean {
    return !!this.admin && (this.admin.is_super || this.admin.permissions.includes(key));
  }

  logout() {
    this.token = null;
    this.role = null;
    this.profile = null;
    this.admin = null;
    if (browser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  get isAuthenticated() {
    return this.token !== null;
  }
}

export const auth = new AuthStore();
