import { api } from "./client";

export interface PermAction {
  key: string;
  action: string;
  label: string;
  sensitive: boolean;
}
export interface PermGroup {
  menu: string;
  label: string;
  actions: PermAction[];
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_super: boolean;
  is_system: boolean;
  permissions: string[];
  permissions_count: number;
  other_permissions_count: number;
  users_count: number;
  /** Pays dans lesquels le role est proposable ; vide = tous. */
  countries: string[];
  is_global: boolean;
  created_at: string | null;
  updated_at: string | null;
}
export interface RoleInput {
  name: string;
  description: string | null;
  permissions: string[];
  countries: string[];
}

export interface AdminUserRow {
  id: number;
  firstname: string;
  lastname: string | null;
  email: string;
  role_id: number | null;
  role_name: string | null;
  is_super: boolean;
  has_access: boolean;
  status: "active" | "suspended";
  must_change_password: boolean;
  mfa_enabled: boolean;
  mfa_exempt: boolean;
  invited: boolean;
  last_login_at: string | null;
  locked: boolean;
  created_at: string | null;
  countries: string[];
  all_countries: boolean;
}
export interface Invitation {
  sent: boolean;
  temp_password: string | null;
}
export interface UserEvent {
  id: number;
  event: string;
  success: boolean;
  ip: string | null;
  detail: string | null;
  created_at: string;
}

export const getPermissions = () => api.get<PermGroup[]>("/access/permissions");

export const listRoles = () => api.get<Role[]>("/access/roles");
export const createRole = (body: RoleInput) => api.post<Role>("/access/roles", body);
export const updateRole = (id: number, body: RoleInput) => api.put<Role>(`/access/roles/${id}`, body);
export const deleteRole = (id: number) => api.delete(`/access/roles/${id}`);

export const listUsers = (q = "", status = "", roleId?: number) => {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (status) p.set("status", status);
  if (roleId) p.set("role_id", String(roleId));
  return api.get<AdminUserRow[]>(`/access/users${p.size ? `?${p}` : ""}`);
};
export const createUser = (body: { firstname: string; lastname: string; email: string; role_id: number; countries: string[]; all_countries: boolean }) =>
  api.post<{ user: AdminUserRow; invitation: Invitation }>("/access/users", body);
export const updateUser = (id: number, body: { firstname: string; lastname: string; role_id: number; countries?: string[]; all_countries?: boolean }) => api.put<AdminUserRow>(`/access/users/${id}`, body);
export const suspendUser = (id: number) => api.post<AdminUserRow>(`/access/users/${id}/suspend`);
export const reactivateUser = (id: number) => api.post<AdminUserRow>(`/access/users/${id}/reactivate`);
export const resetUserPassword = (id: number) => api.post<{ user: AdminUserRow; invitation: Invitation }>(`/access/users/${id}/reset-password`);
export const resetUserMfa = (id: number) => api.post<AdminUserRow>(`/access/users/${id}/reset-mfa`);
export const userEvents = (id: number) => api.get<UserEvent[]>(`/access/users/${id}/events`);
