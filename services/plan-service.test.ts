import { describe, expect, it } from "vitest";
import { mapBudgetPlan, mapPeriodSummary, planBody } from "./plan-service";

describe("mapPeriodSummary", () => {
  it("maps snake_case and defaults missing numbers", () => {
    const s = mapPeriodSummary({
      budget_id: "b",
      period_from: "2026-10-01",
      period_to: "2026-11-01",
      days_left: 9,
      total_available: 100,
      rollover_policy: "carry_forward",
      categories: [{ category_id: "c", name: "Food", planned: 10, carry_in: 5, available: 15, spent: 12, pct: 80, status: "warn" }],
      daily: [{ date: "2026-10-01", expense: 3 }],
    });
    expect(s.daysLeft).toBe(9);
    expect(s.rolloverPolicy).toBe("carry_forward");
    expect(s.categories[0]).toMatchObject({ categoryId: "c", carryIn: 5, status: "warn" });
    expect(s.daily[0]).toEqual({ date: "2026-10-01", income: 0, expense: 3 });
    expect(s.transferIn).toBe(0);
  });

  it("treats an unknown status as ok and an unknown policy as reset", () => {
    const s = mapPeriodSummary({ rollover_policy: "weird", categories: [{ status: "nope" }] });
    expect(s.rolloverPolicy).toBe("reset");
    expect(s.categories[0].status).toBe("ok");
  });
});

describe("mapBudgetPlan", () => {
  it("keeps a null override distinct from zero", () => {
    const p = mapBudgetPlan({
      categories: [
        { category_id: "a", kind: 1, default_planned: 5, planned: 5 },
        { category_id: "b", kind: 2, default_planned: 0, period_override: 0, planned: 0 },
      ],
    });
    expect(p.categories[0].periodOverride).toBeNull();
    expect(p.categories[0].kind).toBe("expense");
    expect(p.categories[1].periodOverride).toBe(0);
    expect(p.categories[1].kind).toBe("income");
  });
});

describe("planBody", () => {
  it("only sends unallocated when provided", () => {
    const withU = planBody([{ categoryId: "a", plannedAmount: 1, scope: "default" }], 7, -1);
    expect(withU).toEqual({
      period_offset: -1,
      items: [{ category_id: "a", planned_amount: 1, scope: "default" }],
      unallocated_planned: 7,
    });
    expect("unallocated_planned" in planBody([], undefined, 0)).toBe(false);
  });
});
