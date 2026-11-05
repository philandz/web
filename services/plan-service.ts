import { apiClient } from "@/lib/http/client";

// ---------------------------------------------------------------------------
// Types — budget period planning (plan R3)
// ---------------------------------------------------------------------------

export type ProgressStatus = "ok" | "warn" | "over";
export type PlanScope = "this_period" | "default";

export interface CategoryProgress {
  categoryId: string; // "" = unallocated (no category)
  name: string;
  icon: string;
  color: string;
  planned: number;
  carryIn: number;
  available: number;
  spent: number;
  pct: number;
  status: ProgressStatus;
}

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

export interface PeriodSummary {
  budgetId: string;
  periodFrom: string;
  periodTo: string;
  daysLeft: number;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  totalAvailable: number;
  totalSpent: number;
  remaining: number;
  safeDailySpend: number;
  projectedPct: number;
  unallocatedSpent: number;
  rolloverPolicy: "reset" | "carry_forward";
  categories: CategoryProgress[];
  daily: DailyPoint[];
}

export interface PlanCategory {
  categoryId: string;
  name: string;
  kind: "expense" | "income";
  icon: string;
  color: string;
  defaultPlanned: number;
  periodOverride: number | null;
  planned: number;
  archived: boolean;
}

export interface BudgetPlan {
  budgetId: string;
  periodFrom: string;
  periodTo: string;
  categories: PlanCategory[];
  unallocatedPlanned: number;
  totalPlanned: number;
}

export interface PlanItemInput {
  categoryId: string;
  plannedAmount: number;
  scope: PlanScope;
}

// ---------------------------------------------------------------------------
// Raw shapes (gateway returns snake_case)
// ---------------------------------------------------------------------------

type Raw = Record<string, any>;

const STATUSES: ProgressStatus[] = ["ok", "warn", "over"];

export function mapPeriodSummary(raw: Raw): PeriodSummary {
  return {
    budgetId: raw.budget_id ?? "",
    periodFrom: raw.period_from ?? "",
    periodTo: raw.period_to ?? "",
    daysLeft: raw.days_left ?? 0,
    income: raw.income ?? 0,
    expense: raw.expense ?? 0,
    transferIn: raw.transfer_in ?? 0,
    transferOut: raw.transfer_out ?? 0,
    totalAvailable: raw.total_available ?? 0,
    totalSpent: raw.total_spent ?? 0,
    remaining: raw.remaining ?? 0,
    safeDailySpend: raw.safe_daily_spend ?? 0,
    projectedPct: raw.projected_pct ?? 0,
    unallocatedSpent: raw.unallocated_spent ?? 0,
    rolloverPolicy: raw.rollover_policy === "carry_forward" ? "carry_forward" : "reset",
    categories: ((raw.categories as Raw[] | undefined) ?? []).map((c) => ({
      categoryId: c.category_id ?? "",
      name: c.name ?? "",
      icon: c.icon ?? "",
      color: c.color ?? "",
      planned: c.planned ?? 0,
      carryIn: c.carry_in ?? 0,
      available: c.available ?? 0,
      spent: c.spent ?? 0,
      pct: c.pct ?? 0,
      status: STATUSES.includes(c.status) ? c.status : "ok",
    })),
    daily: ((raw.daily as Raw[] | undefined) ?? []).map((d) => ({
      date: d.date,
      income: d.income ?? 0,
      expense: d.expense ?? 0,
    })),
  };
}

export function mapBudgetPlan(raw: Raw): BudgetPlan {
  return {
    budgetId: raw.budget_id ?? "",
    periodFrom: raw.period_from ?? "",
    periodTo: raw.period_to ?? "",
    unallocatedPlanned: raw.unallocated_planned ?? 0,
    totalPlanned: raw.total_planned ?? 0,
    categories: ((raw.categories as Raw[] | undefined) ?? []).map((c) => ({
      categoryId: c.category_id,
      name: c.name ?? "",
      kind: c.kind === 2 || c.kind === "income" ? "income" : "expense",
      icon: c.icon ?? "",
      color: c.color ?? "",
      defaultPlanned: c.default_planned ?? 0,
      periodOverride: c.period_override ?? null,
      planned: c.planned ?? 0,
      archived: Boolean(c.archived),
    })),
  };
}

export function planBody(items: PlanItemInput[], unallocatedPlanned: number | undefined, periodOffset: number) {
  return {
    period_offset: periodOffset,
    items: items.map((i) => ({
      category_id: i.categoryId,
      planned_amount: i.plannedAmount,
      scope: i.scope,
    })),
    ...(unallocatedPlanned !== undefined ? { unallocated_planned: unallocatedPlanned } : {}),
  };
}

export const planService = {
  async getPeriodSummary(budgetId: string, offset = 0): Promise<PeriodSummary> {
    const raw = await apiClient.get<Raw>(
      `/api/insight/budgets/${budgetId}/period-summary?offset=${offset}`,
    );
    return mapPeriodSummary(raw);
  },

  async getPlan(budgetId: string, periodOffset = 0): Promise<BudgetPlan> {
    const raw = await apiClient.get<Raw>(
      `/api/category/budgets/${budgetId}/plan?period_offset=${periodOffset}`,
    );
    return mapBudgetPlan(raw);
  },

  async setPlan(
    budgetId: string,
    items: PlanItemInput[],
    opts: { unallocatedPlanned?: number; periodOffset?: number } = {},
  ): Promise<BudgetPlan> {
    const raw = await apiClient.put<Raw>(
      `/api/category/budgets/${budgetId}/plan`,
      planBody(items, opts.unallocatedPlanned, opts.periodOffset ?? 0),
    );
    return mapBudgetPlan(raw);
  },
};
