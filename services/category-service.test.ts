import { describe, expect, it, vi } from "vitest";
import { categoryService } from "./category-service";

vi.mock("@/lib/http/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
  },
}));

describe("categoryService", () => {
  describe("createCategory", () => {
    it("sends canonical kind field", async () => {
      const { apiClient } = await import("@/lib/http/client");
      vi.mocked(apiClient.post).mockResolvedValue({
        id: "cat-1",
        budget_id: "budget-1",
        name: "Salary",
        kind: 2,
        cat_type: 2,
        icon: "💰",
        color: "#22c55e",
        planned_amount: 5000000,
        actual_spend: 0,
        usage_pct: 0,
        tx_count: 0,
        archived: false,
      });

      const result = await categoryService.createCategory("budget-1", {
        name: "Salary",
        type: "income",
        icon: "💰",
        color: "#22c55e",
        plannedAmount: 5000000,
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/category/budgets/budget-1/categories",
        expect.objectContaining({ kind: 2 }),
      );
      expect(result.type).toBe("income");
    });

    it("maps response kind to type", async () => {
      const { apiClient } = await import("@/lib/http/client");
      vi.mocked(apiClient.post).mockResolvedValue({
        id: "cat-1",
        budget_id: "budget-1",
        name: "Groceries",
        kind: 1,
        cat_type: 1,
        icon: "🛒",
        color: "#ef4444",
        planned_amount: 2000000,
        actual_spend: 500000,
        usage_pct: 25,
        tx_count: 10,
        archived: false,
      });

      const result = await categoryService.createCategory("budget-1", {
        name: "Groceries",
        type: "expense",
        icon: "🛒",
        color: "#ef4444",
        plannedAmount: 2000000,
      });

      expect(result.type).toBe("expense");
    });
  });
});
