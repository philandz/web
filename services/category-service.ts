import { apiClient } from "@/lib/http/client";

const BASE = "/api/category";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  budgetId: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  plannedAmount?: number;
  actualSpend: number;
  usagePct: number;
  transactionCount: number;
  archived: boolean;
}

// ---------------------------------------------------------------------------
// Raw shapes — gateway returns flat objects
// ---------------------------------------------------------------------------

interface RawCategory {
  id: string;
  budget_id: string;
  name: string;
  // gateway maps proto enum int → field name "cat_type"
  cat_type: number | string;
  icon?: string;
  color?: string;
  planned_amount?: number;
  actual_spend?: number;
  usage_pct?: number;
  tx_count?: number;
  archived?: boolean;
}

const CAT_TYPE_MAP: Record<number, CategoryType> = { 1: "expense", 2: "income" };

function toCatType(v: number | string): CategoryType {
  if (typeof v === "number") return CAT_TYPE_MAP[v] ?? "expense";
  return (v as CategoryType) || "expense";
}

function mapCategory(raw: RawCategory): Category {
  return {
    id: raw.id,
    budgetId: raw.budget_id,
    name: raw.name,
    type: toCatType(raw.cat_type),
    icon: raw.icon ?? "📦",
    color: raw.color ?? "#6366f1",
    plannedAmount: raw.planned_amount,
    actualSpend: raw.actual_spend ?? 0,
    usagePct: raw.usage_pct ?? 0,
    transactionCount: raw.tx_count ?? 0,
    archived: raw.archived ?? false,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const categoryService = {
  async listCategories(budgetId: string): Promise<Category[]> {
    const raw = await apiClient.get<{ categories: RawCategory[] }>(
      `${BASE}/budgets/${budgetId}/categories`
    );
    return (raw.categories ?? []).map(mapCategory);
  },

  async createCategory(
    budgetId: string,
    input: { name: string; type: CategoryType; icon?: string; color?: string; plannedAmount?: number }
  ): Promise<Category> {
    const raw = await apiClient.post<RawCategory>(
      `${BASE}/budgets/${budgetId}/categories`,
      {
        name: input.name,
        cat_type: input.type === "income" ? 2 : 1,
        icon: input.icon ?? "📦",
        color: input.color ?? "#6366f1",
        planned_amount: input.plannedAmount,
      }
    );
    return mapCategory(raw);
  },

  async updateCategory(
    _budgetId: string,
    categoryId: string,
    input: { name?: string; icon?: string; color?: string; plannedAmount?: number }
  ): Promise<Category> {
    const raw = await apiClient.patch<RawCategory>(
      `${BASE}/categories/${categoryId}`,
      { name: input.name, icon: input.icon, color: input.color, planned_amount: input.plannedAmount }
    );
    return mapCategory(raw);
  },

  async archiveCategory(_budgetId: string, categoryId: string): Promise<void> {
    await apiClient.patch(`${BASE}/categories/${categoryId}/archive`, {});
  },

  async deleteCategory(_budgetId: string, categoryId: string): Promise<void> {
    await apiClient.request(`${BASE}/categories/${categoryId}`, { method: "DELETE" });
  },
};
