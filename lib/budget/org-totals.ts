import type { Budget } from "@/services/budget-service";
import type { PeriodSummary } from "@/services/plan-service";
import type { FundSummary } from "@/services/portfolio-service";

export interface OrgTotals {
  /** null when the budgets mix currencies (totals would be meaningless) */
  currency: string | null;
  spent: number;
  available: number;
  remaining: number;
}

/** Sums period summaries of standard budgets; refuses to add across currencies. */
export function sumPeriodSummaries(
  items: { budget: Budget; summary: PeriodSummary | undefined }[],
): OrgTotals {
  const ready = items.filter((i) => i.summary);
  const currencies = new Set(ready.map((i) => i.budget.currency));
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  if (!currency) return { currency: null, spent: 0, available: 0, remaining: 0 };
  return ready.reduce<OrgTotals>(
    (acc, { summary }) => ({
      currency,
      spent: acc.spent + summary!.totalSpent,
      available: acc.available + summary!.totalAvailable,
      remaining: acc.remaining + summary!.remaining,
    }),
    { currency, spent: 0, available: 0, remaining: 0 },
  );
}

/**
 * Total fund value across saving budgets; null when currencies are mixed or
 * none exist.
 *
 * The value comes from the loaded fund summaries: the budget list API always
 * reports `totalCurrentValue` as 0 for saving budgets, so summing that field
 * would always report 0.
 */
export function sumFundValue(
  budgets: Budget[],
  funds: Map<string, FundSummary>,
): { currency: string; value: number } | null {
  const saving = budgets.filter((b) => b.type === "saving");
  if (saving.length === 0) return null;
  const currencies = new Set(saving.map((b) => b.currency));
  if (currencies.size !== 1) return null;
  return {
    currency: saving[0].currency,
    value: saving.reduce((s, b) => s + (funds.get(b.id)?.totalValue ?? 0), 0),
  };
}
