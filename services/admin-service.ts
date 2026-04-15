import { normalizeUserType } from "@/lib/identity-normalize";
import { apiClient } from "@/lib/http/client";

const BASE = "/api/identity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  userType: "normal" | "super_admin";
  status: "active" | "disabled";
  createdAt: number;
}

export interface AdminOrg {
  id: string;
  name: string;
  ownerId: string;
  status: "active" | "disabled";
  createdAt: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}

export interface ListParams {
  q?: string;
  status?: string;
  userType?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  meta: PageMeta;
}

// ---------------------------------------------------------------------------
// Raw response shapes
// ---------------------------------------------------------------------------

interface RawBase {
  id: string;
  owner_id?: string;
  status?: string;
  created_at?: number;
}

interface RawUser {
  base?: RawBase;
  email: string;
  display_name: string;
  user_type: string;
}

interface RawOrg {
  base?: RawBase;
  name: string;
}

interface RawMeta {
  page: number;
  page_size: number;
  total_pages: number;
  total_rows: number;
}

function normalizeStatus(input: unknown): "active" | "disabled" {
  // Proto BaseStatus: 1=active, 8=disabled
  if (typeof input === "number") {
    return input === 8 ? "disabled" : "active";
  }
  const s = String(input ?? "").toLowerCase();
  return s === "disabled" ? "disabled" : "active";
}

function mapUser(raw: RawUser): AdminUser {
  return {
    id: raw.base?.id ?? "",
    email: raw.email,
    displayName: raw.display_name,
    userType: normalizeUserType(raw.user_type),
    status: normalizeStatus(raw.base?.status),
    createdAt: raw.base?.created_at ?? 0,
  };
}

function mapOrg(raw: RawOrg): AdminOrg {
  return {
    id: raw.base?.id ?? "",
    name: raw.name,
    ownerId: raw.base?.owner_id ?? "",
    status: normalizeStatus(raw.base?.status),
    createdAt: raw.base?.created_at ?? 0,
  };
}

function mapMeta(raw?: RawMeta): PageMeta {
  return {
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? 20,
    totalPages: raw?.total_pages ?? 1,
    totalRows: raw?.total_rows ?? 0,
  };
}

function buildQuery(params: ListParams): string {
  const p = new URLSearchParams();
  if (params.q)        p.set("q", params.q);
  if (params.status)   p.set("status", params.status);
  if (params.userType) p.set("user_type", params.userType);
  if (params.sortBy)   p.set("sort_by", params.sortBy);
  if (params.sortDir)  p.set("sort_dir", params.sortDir);
  if (params.page)     p.set("page", String(params.page));
  if (params.pageSize) p.set("page_size", String(params.pageSize));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const adminService = {
  // Users
  async listUsers(params: ListParams = {}): Promise<PagedResult<AdminUser>> {
    const raw = await apiClient.get<{ users: RawUser[]; meta: RawMeta }>(
      `${BASE}/users${buildQuery(params)}`
    );
    return { items: raw.users.map(mapUser), meta: mapMeta(raw.meta) };
  },

  async getUser(userId: string): Promise<AdminUser> {
    const raw = await apiClient.get<{ user: RawUser }>(`${BASE}/users/${userId}`);
    return mapUser(raw.user);
  },

  async createUser(input: {
    email: string;
    password: string;
    displayName: string;
    userType?: "normal" | "super_admin";
  }): Promise<AdminUser> {
    const raw = await apiClient.post<{ user: RawUser }>(`${BASE}/users`, {
      email: input.email,
      password: input.password,
      display_name: input.displayName,
      user_type: input.userType,
    });
    return mapUser(raw.user);
  },

  async updateUser(
    userId: string,
    input: { displayName?: string; userType?: string; status?: string }
  ): Promise<AdminUser> {
    const raw = await apiClient.patch<{ user: RawUser }>(`${BASE}/users/${userId}`, {
      display_name: input.displayName,
      user_type: input.userType,
      status: input.status,
    });
    return mapUser(raw.user);
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.request(`${BASE}/users/${userId}`, { method: "DELETE" });
  },

  // Organizations
  async listOrgs(params: ListParams = {}): Promise<PagedResult<AdminOrg>> {
    const raw = await apiClient.get<{ organizations: RawOrg[]; meta: RawMeta }>(
      `${BASE}/organizations/all${buildQuery(params)}`
    );
    return { items: raw.organizations.map(mapOrg), meta: mapMeta(raw.meta) };
  },

  async createOrg(input: { name: string; ownerUserId: string }): Promise<AdminOrg> {
    const raw = await apiClient.post<{ organization: RawOrg }>(`${BASE}/organizations`, {
      name: input.name,
      owner_user_id: input.ownerUserId,
    });
    return mapOrg(raw.organization);
  },

  async updateOrg(
    orgId: string,
    input: { name?: string; status?: string }
  ): Promise<AdminOrg> {
    const raw = await apiClient.patch<{ organization: RawOrg }>(
      `${BASE}/organizations/${orgId}`,
      { name: input.name, status: input.status }
    );
    return mapOrg(raw.organization);
  },

  async deleteOrg(orgId: string): Promise<void> {
    await apiClient.request(`${BASE}/organizations/${orgId}`, { method: "DELETE" });
  },
};
