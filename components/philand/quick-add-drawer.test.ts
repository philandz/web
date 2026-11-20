import { describe, expect, it } from "vitest";

import { isRowValid, mapRow, parseRowAmount, type QuickAddRow } from "./quick-add-drawer";

const row = (over: Partial<QuickAddRow>): QuickAddRow => ({
  id: "1",
  date: "2026-11-20",
  type: "expense",
  description: "Lunch",
  categoryId: "",
  amount: "",
  ...over,
});

describe("quick add amounts", () => {
  it("accepts the VND shorthand and thousand separators", () => {
    expect(parseRowAmount("50k")).toBe(50_000);
    expect(parseRowAmount("1tr5")).toBe(1_500_000);
    expect(parseRowAmount("55.000")).toBe(55_000);
  });

  it("takes plain numbers for other currencies", () => {
    expect(parseRowAmount("12.5", "USD")).toBe(12.5);
    expect(parseRowAmount("1,200", "USD")).toBe(1200);
    expect(parseRowAmount("abc", "USD")).toBeNull();
  });

  it("needs a description and a positive amount", () => {
    expect(isRowValid(row({ amount: "50k" }))).toBe(true);
    expect(isRowValid(row({ amount: "" }))).toBe(false);
    expect(isRowValid(row({ amount: "50k", description: "  " }))).toBe(false);
  });

  it("sends the parsed amount, not the typed text", () => {
    // "55.000" must not become 55.
    expect(mapRow(row({ amount: "55.000" })).amount).toBe(55_000);
    expect(mapRow(row({ amount: "30tr", type: "income" }))).toMatchObject({ amount: 30_000_000, kind: 2 });
  });
});
