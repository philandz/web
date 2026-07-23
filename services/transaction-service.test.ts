import { describe, expect, it, vi } from "vitest";
import { transactionService } from "./transaction-service";

// Mock the apiClient module
vi.mock("@/lib/http/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("transactionService.getSummary", () => {
  it("maps snake_case summary JSON to camelCase EntrySummary", async () => {
    const { apiClient } = await import("@/lib/http/client");

    // Arrange: mock API returns snake_case JSON
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      budget_id: "budget-1",
      total_income: 1_000_000,
      total_expense: 300_000,
      current_balance: 700_000,
    });

    // Act
    const result = await transactionService.getSummary("budget-1");

    // Assert
    expect(result).toEqual({
      budgetId: "budget-1",
      totalIncome: 1_000_000,
      totalExpense: 300_000,
      currentBalance: 700_000,
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/entry/budgets/budget-1/summary"
    );
  });
});
