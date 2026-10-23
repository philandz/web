import { describe, expect, it } from "vitest";
import { pickDefaultCategory } from "./composer-defaults";

const cats = [
  { id: "a", type: "expense" as const, archived: false },
  { id: "b", type: "income" as const, archived: false },
  { id: "c", type: "expense" as const, archived: true },
];

describe("pickDefaultCategory", () => {
  it("returns the last used category when still valid", () => {
    expect(pickDefaultCategory(cats, "expense", "a")).toBe("a");
  });
  it("ignores categories of another type or archived ones", () => {
    expect(pickDefaultCategory(cats, "expense", "b")).toBe("");
    expect(pickDefaultCategory(cats, "expense", "c")).toBe("");
  });
  it("returns empty without a last used id", () => {
    expect(pickDefaultCategory(cats, "income", null)).toBe("");
  });
});
