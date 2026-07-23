import { describe, expect, it, vi } from "vitest";
import { budgetService } from "./budget-service";

vi.mock("@/lib/http/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
  },
}));

describe("budgetService.listBudgets", () => {
  it("sends query params and returns PagedBudgets with meta", async () => {
    const { apiClient } = await import("@/lib/http/client");
    vi.mocked(apiClient.get).mockResolvedValue({
      budgets: [
        {
          id: "budget-1",
          org_id: "org-1",
          name: "Alpha",
          budget_type: 1,
          currency: "VND",
          my_role: 1,
          envelope_limit: 0,
          current_spend: 0,
          burn_rate_pct: 0,
          member_count: 1,
          created_at: 1000,
          updated_at: 2000,
        },
      ],
      meta: {
        page: 1,
        page_size: 20,
        total_pages: 1,
        total_rows: 1,
      },
    });

    const result = await budgetService.listBudgets({
      orgId: "org-1",
      q: "alpha",
      type: "standard",
      role: "owner",
      sortBy: "name",
      sortDir: "asc",
      page: 1,
      pageSize: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/budget/budgets?org_id=org-1&q=alpha&type=standard&role=owner&sort_by=name&sort_dir=asc&page=1&page_size=20"
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alpha");
    expect(result.meta.totalRows).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.pageSize).toBe(20);
  });

  it("returns empty items with meta when no results", async () => {
    const { apiClient } = await import("@/lib/http/client");
    vi.mocked(apiClient.get).mockResolvedValue({
      budgets: [],
      meta: {
        page: 1,
        page_size: 20,
        total_pages: 0,
        total_rows: 0,
      },
    });

    const result = await budgetService.listBudgets({ orgId: "org-1" });

    expect(result.items).toHaveLength(0);
    expect(result.meta.totalRows).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });
});
