import { apiClient } from "@/lib/http/client";

const BASE = "/api/budget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BudgetType = "standard" | "saving" | "debt" | "invest" | "sharing";
export type BudgetRole = "owner" | "manager" | "contributor" | "viewer";

export interface Budget {
  id: string;
  orgId: string;
  name: string;
  type: BudgetType;
  currency: string;
  myRole: BudgetRole;
  envelopeLimit?: number;
  burnRatePct?: number;
  currentSpend?: number;
  memberCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetMember {
  budgetId: string;
  userId: string;
  displayName: string;
  email: string;
  role: BudgetRole;
}

export interface EnvelopeLimit {
  budgetId: string;
  monthlyLimit: number;
  currentSpend: number;
  burnRatePct: number;
  limitExceeded: boolean;
}

export type RolloverPolicy = "reset" | "carry_forward";

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  type: BudgetType;
}

export interface BudgetListParams {
  orgId: string;
  q?: string;
  type?: BudgetType;
  role?: BudgetRole;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Raw response shapes
// ---------------------------------------------------------------------------

interface RawBase {
  id: string;
  created_at?: number;
  updated_at?: number;
}

interface RawBudget {
  // Gateway flattens base fields to top level
  id?: string;
  base?: RawBase;
  org_id: string;
  name: string;
  budget_type: number | string;
  currency: string;
  my_role: number | string;
  created_at?: number;
  updated_at?: number;
}

interface RawMember {
  budget_id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: number | string;
}

interface RawEnvelope {
  budget_id: string;
  monthly_limit: number;
  current_spend: number;
  burn_rate_pct: number;
  limit_exceeded: boolean;
}

interface RawTemplate {
  id: string;
  name: string;
  description: string;
  budget_type: number | string;
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

const BUDGET_TYPE_MAP: Record<number, BudgetType> = {
  1: "standard", 2: "saving", 3: "debt", 4: "invest", 5: "sharing",
};
const BUDGET_ROLE_MAP: Record<number, BudgetRole> = {
  1: "owner", 2: "manager", 3: "contributor", 4: "viewer",
};

function toBudgetType(v: number | string): BudgetType {
  if (typeof v === "number") return BUDGET_TYPE_MAP[v] ?? "standard";
  return (v as BudgetType) || "standard";
}

function toBudgetRole(v: number | string): BudgetRole {
  if (typeof v === "number") return BUDGET_ROLE_MAP[v] ?? "viewer";
  return (v as BudgetRole) || "viewer";
}

function mapBudget(raw: RawBudget): Budget {
  return {
    id: raw.id ?? raw.base?.id ?? "",
    orgId: raw.org_id,
    name: raw.name,
    type: toBudgetType(raw.budget_type),
    currency: raw.currency,
    myRole: toBudgetRole(raw.my_role),
    createdAt: raw.created_at ?? raw.base?.created_at ?? 0,
    updatedAt: raw.updated_at ?? raw.base?.updated_at ?? 0,
  };
}

function mapMember(raw: RawMember): BudgetMember {
  return {
    budgetId: raw.budget_id,
    userId: raw.user_id,
    displayName: raw.display_name,
    email: raw.email,
    role: toBudgetRole(raw.role),
  };
}

function mapEnvelope(raw: RawEnvelope): EnvelopeLimit {
  return {
    budgetId: raw.budget_id,
    monthlyLimit: raw.monthly_limit,
    currentSpend: raw.current_spend,
    burnRatePct: raw.burn_rate_pct,
    limitExceeded: raw.limit_exceeded,
  };
}

function mapTemplate(raw: RawTemplate): BudgetTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    type: toBudgetType(raw.budget_type),
  };
}

function buildQuery(params: Omit<BudgetListParams, "orgId"> & { orgId?: string }): string {
  const p = new URLSearchParams();
  if (params.orgId)    p.set("org_id", params.orgId);
  if (params.q)        p.set("q", params.q);
  if (params.type)     p.set("type", params.type);
  if (params.role)     p.set("role", params.role);
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

export const budgetService = {
  // Budget CRUD
  async listBudgets(params: BudgetListParams): Promise<Budget[]> {
    const raw = await apiClient.get<{ budgets: RawBudget[] }>(
      `${BASE}/budgets${buildQuery(params)}`
    );
    return (raw.budgets ?? []).map(mapBudget);
  },

  async getBudget(budgetId: string): Promise<Budget> {
    const raw = await apiClient.get<RawBudget>(
      `${BASE}/budgets/${budgetId}`
    );
    return mapBudget(raw);
  },

  async createBudget(input: {
    orgId: string;
    name: string;
    type: BudgetType;
    currency?: string;
    templateId?: string;
  }): Promise<Budget> {
    const raw = await apiClient.post<RawBudget>(`${BASE}/budgets`, {
      org_id: input.orgId,
      name: input.name,
      budget_type: input.type,
      currency: input.currency ?? "VND",
      template_id: input.templateId ?? "",
    });
    return mapBudget(raw);
  },

  async updateBudget(
    budgetId: string,
    input: { name?: string; type?: BudgetType }
  ): Promise<Budget> {
    const raw = await apiClient.patch<RawBudget>(
      `${BASE}/budgets/${budgetId}`,
      { name: input.name, budget_type: input.type }
    );
    return mapBudget(raw);
  },

  async deleteBudget(budgetId: string): Promise<void> {
    await apiClient.request(`${BASE}/budgets/${budgetId}`, { method: "DELETE" });
  },

  // Members
  async listMembers(budgetId: string): Promise<BudgetMember[]> {
    const raw = await apiClient.get<{ members: RawMember[] }>(
      `${BASE}/budgets/${budgetId}/members`
    );
    return (raw.members ?? []).map(mapMember);
  },

  async addMember(
    budgetId: string,
    input: { userId: string; role: BudgetRole }
  ): Promise<BudgetMember> {
    const raw = await apiClient.post<{ member: RawMember }>(
      `${BASE}/budgets/${budgetId}/members`,
      { user_id: input.userId, role: input.role }
    );
    return mapMember(raw.member);
  },

  async updateMemberRole(
    budgetId: string,
    userId: string,
    role: BudgetRole
  ): Promise<BudgetMember> {
    const raw = await apiClient.patch<{ member: RawMember }>(
      `${BASE}/budgets/${budgetId}/members/${userId}/role`,
      { role }
    );
    return mapMember(raw.member);
  },

  async removeMember(budgetId: string, userId: string): Promise<void> {
    await apiClient.request(`${BASE}/budgets/${budgetId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  // Envelope limit
  async setEnvelope(budgetId: string, monthlyLimit: number): Promise<EnvelopeLimit> {
    const raw = await apiClient.request<{ envelope: RawEnvelope }>(
      `${BASE}/budgets/${budgetId}/envelope`,
      { method: "PUT", body: { monthly_limit: monthlyLimit } }
    );
    return mapEnvelope(raw.envelope);
  },

  async getBurnRate(budgetId: string): Promise<EnvelopeLimit> {
    const raw = await apiClient.get<{ envelope: RawEnvelope }>(
      `${BASE}/budgets/${budgetId}/burn-rate`
    );
    return mapEnvelope(raw.envelope);
  },

  // Rollover policy
  async setRollover(budgetId: string, policy: RolloverPolicy): Promise<void> {
    await apiClient.request(`${BASE}/budgets/${budgetId}/rollover`, {
      method: "PUT",
      body: { policy },
    });
  },

  async getRollover(budgetId: string): Promise<RolloverPolicy> {
    const raw = await apiClient.get<{ policy: number | string }>(
      `${BASE}/budgets/${budgetId}/rollover`
    );
    const v = raw.policy;
    if (typeof v === "number") return v === 2 ? "carry_forward" : "reset";
    return (v as RolloverPolicy) || "reset";
  },

  // Templates
  async listTemplates(): Promise<BudgetTemplate[]> {
    const raw = await apiClient.get<{ templates: RawTemplate[] }>(
      `${BASE}/templates`
    );
    return (raw.templates ?? []).map(mapTemplate);
  },
};
