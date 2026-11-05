import { describe, expect, it } from "vitest";
import { acceptsManualEntries, BUDGET_TYPE_META, budgetTypeMeta } from "./budget-types";

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


describe("acceptsManualEntries", () => {
  it("never accepts sharing", () => {
    expect(acceptsManualEntries("sharing", false)).toBe(false);
    expect(acceptsManualEntries("sharing", true)).toBe(false);
  });
  it("accepts saving only while it is not a fund", () => {
    expect(acceptsManualEntries("saving", false)).toBe(true);
    expect(acceptsManualEntries("saving", true)).toBe(false);
  });
  it("accepts debt only while it is not a debt book", () => {
    expect(acceptsManualEntries("debt", true, false)).toBe(true);
    expect(acceptsManualEntries("debt", true, true)).toBe(false);
  });
  it("accepts the ledger types", () => {
    for (const t of ["standard", "invest"]) expect(acceptsManualEntries(t, true)).toBe(true);
  });
});
