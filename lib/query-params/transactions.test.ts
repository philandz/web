import { describe, expect, it } from "vitest";
import { countActiveFilters, defaultDraft } from "./transactions";

describe("countActiveFilters", () => {
  it("is 0 for the defaults", () => {
    expect(countActiveFilters(defaultDraft())).toBe(0);
  });

  it("ignores view settings: sort, direction, page, page size and the date range", () => {
    expect(
      countActiveFilters({
        ...defaultDraft(),
        sortBy: "amount",
        sortDir: "asc",
        page: 4,
        pageSize: 100,
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
      }),
    ).toBe(0);
  });

  it("counts search, type, categories and members once each", () => {
    expect(
      countActiveFilters({
        ...defaultDraft(),
        q: "coffee",
        type: "transfer",
        categoryIds: ["a", "b"],
        memberIds: ["u1"],
      }),
    ).toBe(4);
  });
});
