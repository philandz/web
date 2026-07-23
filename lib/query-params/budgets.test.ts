import { describe, expect, it } from "vitest";
import {
  changeBudgetFilter,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIR,
  parseBudgetFilters,
  serializeBudgetFilters,
} from "./budgets";

describe("parseBudgetFilters", () => {
  it("returns defaults for empty params", () => {
    const filters = parseBudgetFilters(new URLSearchParams());
    expect(filters.q).toBeUndefined();
    expect(filters.type).toBeUndefined();
    expect(filters.role).toBeUndefined();
    expect(filters.sortBy).toBe(DEFAULT_SORT_BY);
    expect(filters.sortDir).toBe(DEFAULT_SORT_DIR);
    expect(filters.page).toBe(DEFAULT_PAGE);
    expect(filters.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("parses q", () => {
    const filters = parseBudgetFilters(new URLSearchParams("q=food"));
    expect(filters.q).toBe("food");
  });

  it("parses valid type", () => {
    const filters = parseBudgetFilters(new URLSearchParams("type=saving"));
    expect(filters.type).toBe("saving");
  });

  it("ignores invalid type", () => {
    const filters = parseBudgetFilters(new URLSearchParams("type=invalid"));
    expect(filters.type).toBeUndefined();
  });

  it("parses valid role", () => {
    const filters = parseBudgetFilters(new URLSearchParams("role=viewer"));
    expect(filters.role).toBe("viewer");
  });

  it("ignores invalid role", () => {
    const filters = parseBudgetFilters(new URLSearchParams("role=admin"));
    expect(filters.role).toBeUndefined();
  });

  it("parses valid sort_by", () => {
    const filters = parseBudgetFilters(new URLSearchParams("sort_by=name"));
    expect(filters.sortBy).toBe("name");
  });

  it("ignores invalid sort_by", () => {
    const filters = parseBudgetFilters(new URLSearchParams("sort_by=created_at"));
    expect(filters.sortBy).toBe(DEFAULT_SORT_BY);
  });

  it("parses valid sort_dir", () => {
    const filters = parseBudgetFilters(new URLSearchParams("sort_dir=asc"));
    expect(filters.sortDir).toBe("asc");
  });

  it("ignores invalid sort_dir", () => {
    const filters = parseBudgetFilters(new URLSearchParams("sort_dir=random"));
    expect(filters.sortDir).toBe(DEFAULT_SORT_DIR);
  });

  it("clamps page to at least 1", () => {
    const filters = parseBudgetFilters(new URLSearchParams("page=0"));
    expect(filters.page).toBe(1);
  });

  it("clamps page_size to 1..100", () => {
    const filters = parseBudgetFilters(new URLSearchParams("page_size=0"));
    expect(filters.pageSize).toBe(1);
    const filters2 = parseBudgetFilters(new URLSearchParams("page_size=999"));
    expect(filters2.pageSize).toBe(100);
  });
});

describe("serializeBudgetFilters", () => {
  it("omits default values", () => {
    const params = serializeBudgetFilters({});
    expect(params.toString()).toBe("");
  });

  it("serializes q", () => {
    const params = serializeBudgetFilters({ q: "food" });
    expect(params.get("q")).toBe("food");
  });

  it("serializes type", () => {
    const params = serializeBudgetFilters({ type: "saving" });
    expect(params.get("type")).toBe("saving");
  });

  it("serializes role", () => {
    const params = serializeBudgetFilters({ role: "viewer" });
    expect(params.get("role")).toBe("viewer");
  });

  it("omits sort_by when equal to default", () => {
    const params = serializeBudgetFilters({ sortBy: "updated_at" });
    expect(params.has("sort_by")).toBe(false);
  });

  it("serializes non-default sort_by", () => {
    const params = serializeBudgetFilters({ sortBy: "name" });
    expect(params.get("sort_by")).toBe("name");
  });

  it("omits sort_dir when equal to default", () => {
    const params = serializeBudgetFilters({ sortDir: "desc" });
    expect(params.has("sort_dir")).toBe(false);
  });

  it("omits page when equal to default", () => {
    const params = serializeBudgetFilters({ page: 1 });
    expect(params.has("page")).toBe(false);
  });

  it("omits page_size when equal to default", () => {
    const params = serializeBudgetFilters({ pageSize: 20 });
    expect(params.has("page_size")).toBe(false);
  });
});

describe("changeBudgetFilter", () => {
  it("resets page to 1 on any filter change", () => {
    const current = { page: 5, q: "old" };
    const next = changeBudgetFilter(current, { q: "new" });
    expect(next.page).toBe(1);
    expect(next.q).toBe("new");
  });

  it("preserves non-changed filters", () => {
    const current = { page: 3, q: "keep", type: "saving" as const };
    const next = changeBudgetFilter(current, { q: "search" });
    expect(next.q).toBe("search");
    expect(next.type).toBe("saving");
    expect(next.page).toBe(1);
  });
});
