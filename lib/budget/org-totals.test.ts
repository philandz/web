import { describe, expect, it } from "vitest";
import { sumFundValue, sumPeriodSummaries } from "./org-totals";
import type { Budget } from "@/services/budget-service";
import type { PeriodSummary } from "@/services/plan-service";

const b = (over: Partial<Budget>) => ({ id: "x", currency: "VND", type: "standard", totalCurrentValue: 0, ...over }) as Budget;
const s = (spent: number, avail: number) =>
  ({ totalSpent: spent, totalAvailable: avail, remaining: avail - spent }) as PeriodSummary;

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
  it("sums saving budgets only", () => {
    expect(
      sumFundValue([b({ type: "saving", totalCurrentValue: 10 }), b({ type: "saving", totalCurrentValue: 5 }), b({})]),
    ).toEqual({ currency: "VND", value: 15 });
  });
  it("is null with no saving budgets or mixed currencies", () => {
    expect(sumFundValue([b({})])).toBeNull();
    expect(sumFundValue([b({ type: "saving" }), b({ type: "saving", currency: "USD" })])).toBeNull();
  });
});
