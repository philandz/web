import { describe, expect, it } from "vitest";
import { sumFundValue, sumPeriodSummaries } from "./org-totals";
import type { Budget } from "@/services/budget-service";
import type { PeriodSummary } from "@/services/plan-service";
import type { FundSummary } from "@/services/portfolio-service";

const b = (over: Partial<Budget>) => ({ id: "x", currency: "VND", type: "standard", totalCurrentValue: 0, ...over }) as Budget;
const s = (spent: number, avail: number) =>
  ({ totalSpent: spent, totalAvailable: avail, remaining: avail - spent }) as PeriodSummary;
const f = (over: Partial<FundSummary>): FundSummary =>
  ({
    budgetId: "x",
    currency: "VND",
    cashBalance: 0,
    holdingsValue: 0,
    totalValue: 0,
    netContributed: 0,
    growth: 0,
    growthPct: 0,
    ...over,
  }) as FundSummary;

describe("sumPeriodSummaries", () => {
  it("adds same-currency budgets and skips unloaded ones", () => {
    const r = sumPeriodSummaries([
      { budget: b({}), summary: s(100, 300) },
      { budget: b({}), summary: s(50, 200) },
      { budget: b({}), summary: undefined },
    ]);
    expect(r).toEqual({ currency: "VND", spent: 150, available: 500, remaining: 350 });
  });

  it("returns no totals when currencies are mixed", () => {
    const r = sumPeriodSummaries([
      { budget: b({}), summary: s(1, 2) },
      { budget: b({ currency: "USD" }), summary: s(1, 2) },
    ]);
    expect(r.currency).toBeNull();
  });
});

describe("sumFundValue", () => {
  it("sums the fund summaries of the saving budgets", () => {
    const funds = new Map<string, FundSummary>([
      ["a", f({ totalValue: 10 })],
      ["b", f({ totalValue: 5 })],
    ]);
    expect(
      sumFundValue([b({ id: "a", type: "saving" }), b({ id: "b", type: "saving" }), b({})], funds),
    ).toEqual({ currency: "VND", value: 15 });
  });
  it("is null with no saving budgets or mixed currencies", () => {
    expect(sumFundValue([b({})], new Map())).toBeNull();
    expect(sumFundValue([b({ type: "saving" }), b({ type: "saving", currency: "USD" })], new Map())).toBeNull();
  });
  it("counts a saving budget without a loaded summary as zero", () => {
    expect(sumFundValue([b({ id: "a", type: "saving", totalCurrentValue: 900 })], new Map())).toEqual({
      currency: "VND",
      value: 0,
    });
  });
});
