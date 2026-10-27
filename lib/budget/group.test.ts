import { describe, expect, it } from "vitest";
import { groupBudgetsByType } from "./group";
import type { Budget } from "@/services/budget-service";

const b = (over: Partial<Budget>) =>
  ({ id: "x", currency: "VND", type: "standard", currentSpend: 0, totalCurrentValue: 0, ...over }) as Budget;

describe("groupBudgetsByType", () => {
  it("orders groups and drops empty ones", () => {
    const g = groupBudgetsByType([b({ type: "sharing" }), b({ type: "standard" }), b({ type: "saving" })]);
    expect(g.map((x) => x.type)).toEqual(["standard", "saving", "sharing"]);
  });

  it("sums spend for standard and value for saving", () => {
    const g = groupBudgetsByType([
      b({ type: "standard", currentSpend: 100 }),
      b({ type: "standard", currentSpend: 50 }),
      b({ type: "saving", totalCurrentValue: 900 }),
    ]);
    expect(g[0].kpi).toEqual({ kind: "spent", currency: "VND", amount: 150 });
    expect(g[1].kpi).toEqual({ kind: "value", currency: "VND", amount: 900 });
  });

  it("does not report a currency when currencies are mixed", () => {
    const g = groupBudgetsByType([b({ currency: "VND" }), b({ currency: "USD" })]);
    expect(g[0].kpi.currency).toBeNull();
  });

  it("does not sum spent across mixed currencies", () => {
    const g = groupBudgetsByType([
      b({ type: "standard", currency: "VND", currentSpend: 100 }),
      b({ type: "standard", currency: "USD", currentSpend: 50 }),
    ]);
    expect(g[0].kpi).toEqual({ kind: "spent", currency: null, amount: 0 });
  });

  it("does not sum value across mixed currencies", () => {
    const g = groupBudgetsByType([
      b({ type: "saving", currency: "VND", totalCurrentValue: 900 }),
      b({ type: "saving", currency: "USD", totalCurrentValue: 10 }),
    ]);
    expect(g[0].kpi).toEqual({ kind: "value", currency: null, amount: 0 });
  });

  it("counts sharing budgets", () => {
    const g = groupBudgetsByType([b({ type: "sharing" }), b({ type: "sharing" })]);
    expect(g[0].kpi).toEqual({ kind: "count", currency: null, amount: 2 });
  });
});
