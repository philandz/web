import type { Budget } from "@/services/budget-service";
import type { FundSummary } from "@/services/portfolio-service";
import type { SharingBudgetSummary } from "@/modules/sharing/hooks";

/**
 * What a budget card shows. One variant per budget family:
 *
 * - `spend`   — spending budgets: spent vs. the monthly envelope limit.
 * - `fund`    — savings funds: total value + growth. A fund has no spending
 *                limit, so "spent / no limit" would be meaningless.
 * - `sharing` — group budgets: my balance, total spent. Also no envelope
 *                limit; what matters is who owes whom.
 */
export type CardMetric =
  | { kind: "spend"; amount: number; limit: number | null; pct: number | null }
  | { kind: "fund"; amount: number; growthPct: number | null; currency: string }
  | { kind: "sharing"; myBalance: number; totalSpent: number; currency: string };

export interface CardMetricData {
  /** Loaded fund summary of a saving budget (cash pocket + holdings). */
  fund?: FundSummary;
  /** Loaded settlement summary of a sharing budget. */
  sharing?: SharingBudgetSummary;
}

/**
 * Decides which metric a budget card renders. Pure — no hooks, no i18n —
 * so the mapping can be unit-tested on its own.
 */
export function cardMetricFor(budget: Budget, data: CardMetricData): CardMetric {
  if (budget.type === "saving") {
    const fund = data.fund;
    return {
      kind: "fund",
      // The fund summary is the real source: the list API always reports
      // `totalCurrentValue` as 0 for saving budgets. The budget field stays
      // as a fallback for a fund summary that has not loaded yet.
      amount: fund ? fund.totalValue : (budget.totalCurrentValue ?? 0),
      growthPct: fund ? fund.growthPct : null,
      currency: fund?.currency || budget.currency,
    };
  }

  if (budget.type === "sharing") {
    const sharing = data.sharing;
    return {
      kind: "sharing",
      myBalance: sharing?.myBalance ?? 0,
      totalSpent: sharing?.totalSpent ?? 0,
      currency: budget.currency,
    };
  }

  // standard | debt | invest — spend against an envelope limit.
  const amount = budget.currentSpend ?? 0;
  const limit = budget.envelopeLimit > 0 ? budget.envelopeLimit : null;
  const pct =
    limit != null
      ? Math.min(100, (amount / limit) * 100)
      : (budget.burnRatePct ?? null);
  return { kind: "spend", amount, limit, pct };
}
