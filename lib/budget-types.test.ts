import { describe, expect, it } from "vitest";
import { BUDGET_TYPE_META, budgetTypeMeta } from "./budget-types";

describe("budget type registry", () => {
  it("covers every budget type with a label, stripe and icon", () => {
    for (const t of ["standard", "saving", "debt", "invest", "sharing"] as const) {
      const m = BUDGET_TYPE_META[t];
      expect(m.label).toBeTruthy();
      expect(m.stripe).toMatch(/^bg-/);
      expect(m.Icon).toBeDefined();
    }
  });
  it("falls back to standard for unknown types", () => {
    expect(budgetTypeMeta("weird")).toBe(BUDGET_TYPE_META.standard);
    expect(budgetTypeMeta(undefined)).toBe(BUDGET_TYPE_META.standard);
  });
});
