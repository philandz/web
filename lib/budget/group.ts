import type { Budget, BudgetType } from "@/services/budget-service";

/** Display order of the grouped budget list. */
export const GROUP_ORDER: BudgetType[] = ["standard", "saving", "invest", "debt", "sharing"];

export interface BudgetGroup {
  type: BudgetType;
  budgets: Budget[];
  /** What the header KPI measures for this type. */
  kpi: { kind: "spent" | "value" | "count"; currency: string | null; amount: number };
}

function kpiFor(type: BudgetType, budgets: Budget[]): BudgetGroup["kpi"] {
  const currencies = new Set(budgets.map((b) => b.currency));
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  if (type === "standard") {
    return { kind: "spent", currency, amount: budgets.reduce((s, b) => s + (b.currentSpend ?? 0), 0) };
  }
  if (type === "saving" || type === "invest") {
    return { kind: "value", currency, amount: budgets.reduce((s, b) => s + (b.totalCurrentValue ?? 0), 0) };
  }
  return { kind: "count", currency: null, amount: budgets.length };
}

/** Groups budgets by type in a stable order; empty groups are dropped. Amounts are only summed within one currency. */
export function groupBudgetsByType(budgets: Budget[]): BudgetGroup[] {
  return GROUP_ORDER.flatMap((type) => {
    const items = budgets.filter((b) => b.type === type);
    return items.length ? [{ type, budgets: items, kpi: kpiFor(type, items) }] : [];
  });
}
