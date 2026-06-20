import { apiClient } from "@/lib/http/client";

const BASE = "/api/sharing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SplitMethod = "equal" | "custom" | "weighted";

export interface ExpenseLeg {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  budgetId: string;
  paidBy: string;
  totalAmount: number;
  description: string;
  expenseDate: string;
  categoryId?: string;
  splitMethod: SplitMethod;
  legs: ExpenseLeg[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  budgetId: string;
  transfers: Transfer[];
}

export interface JoinLink {
  token: string;
  budgetId: string;
  joinUrl: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Raw shapes
// ---------------------------------------------------------------------------

interface RawBase {
  id?: string;
  created_at?: number;
  updated_at?: number;
  created_by?: string;
}

interface RawExpense {
  base?: RawBase;
  id?: string;
  budget_id: string;
  paid_by: string;
  total_amount: number;
  description: string;
  expense_date: string;
  category_id?: string;
  split_method: number;
  legs?: RawLeg[];
  created_by?: string;
  created_at?: number;
  updated_at?: number;
}

interface RawLeg {
  user_id: string;
  amount: number;
}

interface RawTransfer {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

interface RawSettlement {
  budget_id: string;
  transfers: RawTransfer[];
}

interface RawJoinLink {
  token: string;
  budget_id: string;
  join_url: string;
  expires_at: number;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const SPLIT_METHOD_MAP: Record<number, SplitMethod> = {
  1: "equal",
  2: "custom",
  3: "weighted",
};

function toSplitMethod(v: number): SplitMethod {
  return SPLIT_METHOD_MAP[v] ?? "equal";
}

function mapExpense(raw: RawExpense): Expense {
  return {
    id: raw.id ?? raw.base?.id ?? "",
    budgetId: raw.budget_id,
    paidBy: raw.paid_by,
    totalAmount: raw.total_amount,
    description: raw.description,
    expenseDate: raw.expense_date,
    categoryId: raw.category_id || undefined,
    splitMethod: toSplitMethod(raw.split_method),
    legs: (raw.legs ?? []).map((l) => ({ userId: l.user_id, amount: l.amount })),
    createdBy: raw.created_by ?? raw.base?.created_by ?? "",
    createdAt: raw.created_at ?? raw.base?.created_at ?? 0,
    updatedAt: raw.updated_at ?? raw.base?.updated_at ?? 0,
  };
}

function mapTransfer(raw: RawTransfer): Transfer {
  return {
    fromUserId: raw.from_user_id,
    fromName: raw.from_name,
    toUserId: raw.to_user_id,
    toName: raw.to_name,
    amount: raw.amount,
  };
}

function mapSettlement(raw: RawSettlement): Settlement {
  return {
    budgetId: raw.budget_id,
    transfers: (raw.transfers ?? []).map(mapTransfer),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const sharingService = {
  async listExpenses(budgetId: string): Promise<Expense[]> {
    const raw = await apiClient.get<{ expenses: RawExpense[] }>(
      `${BASE}/budgets/${budgetId}/expenses`
    );
    return (raw.expenses ?? []).map(mapExpense);
  },

  async getExpense(expenseId: string): Promise<Expense> {
    const raw = await apiClient.get<RawExpense>(`${BASE}/expenses/${expenseId}`);
    return mapExpense(raw);
  },

  async addExpense(input: {
    budgetId: string;
    paidBy: string;
    totalAmount: number;
    description: string;
    expenseDate: string;
    categoryId?: string;
    splitMethod: SplitMethod;
    legs: ExpenseLeg[];
  }): Promise<Expense> {
    const splitMethodMap: Record<SplitMethod, number> = {
      equal: 1, custom: 2, weighted: 3,
    };
    const raw = await apiClient.post<RawExpense>(
      `${BASE}/budgets/${input.budgetId}/expenses`,
      {
        paid_by: input.paidBy,
        total_amount: input.totalAmount,
        description: input.description,
        expense_date: input.expenseDate,
        category_id: input.categoryId ?? "",
        split_method: splitMethodMap[input.splitMethod],
        legs: input.legs.map((l) => ({ user_id: l.userId, amount: l.amount })),
      }
    );
    return mapExpense(raw);
  },

  async deleteExpense(expenseId: string): Promise<void> {
    await apiClient.request(`${BASE}/expenses/${expenseId}`, { method: "DELETE" });
  },

  async calculateSettlement(budgetId: string): Promise<Settlement> {
    const raw = await apiClient.get<RawSettlement>(
      `${BASE}/budgets/${budgetId}/settlement`
    );
    return mapSettlement(raw);
  },

  async generateJoinLink(budgetId: string): Promise<JoinLink> {
    const raw = await apiClient.post<RawJoinLink>(
      `${BASE}/budgets/${budgetId}/join-link`,
      {}
    );
    return {
      token: raw.token,
      budgetId: raw.budget_id,
      joinUrl: raw.join_url,
      expiresAt: raw.expires_at,
    };
  },

  async acceptJoinLink(token: string): Promise<void> {
    await apiClient.post(`${BASE}/join-link/accept`, { token });
  },
};