import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/services/sharing-service", () => ({
  sharingService: {
    getBalances: vi.fn(),
    listExpenses: vi.fn(),
  },
}));

import { sharingService } from "@/services/sharing-service";
import { useAuthStore } from "@/lib/auth-store";
import {
  summarizeSharingBudget,
  useSharingBudgetSummaries,
} from "@/modules/sharing/hooks";
import type { Expense } from "@/services/sharing-service";

const BALANCES = [
  {
    userId: "u1",
    displayName: "Ann",
    email: "ann@example.com",
    netBalance: -250000,
  },
  {
    userId: "u2",
    displayName: "Bob",
    email: "bob@example.com",
    netBalance: 250000,
  },
];

function expense(id: string, totalAmount: number): Expense {
  return {
    id,
    budgetId: "b1",
    paidBy: "u1",
    totalAmount,
    description: "dinner",
    expenseDate: "2026-10-01",
    splitMethod: "equal",
    legs: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    profile: {
      id: "u1",
      email: "ann@example.com",
      displayName: "Ann",
      userType: "normal",
    },
  });
});

describe("summarizeSharingBudget", () => {
  it("looks up my net balance by user id", () => {
    expect(summarizeSharingBudget(BALANCES, [], "u1").myBalance).toBe(-250000);
    expect(summarizeSharingBudget(BALANCES, [], "u2").myBalance).toBe(250000);
  });

  it("uses 0 when the current user is not a participant", () => {
    expect(summarizeSharingBudget(BALANCES, [], "u3").myBalance).toBe(0);
  });

  it("uses 0 when there is no current user (guest)", () => {
    expect(summarizeSharingBudget(BALANCES, [], undefined).myBalance).toBe(0);
  });

  it("sums every expense total", () => {
    const expenses = [expense("e1", 1000), expense("e2", 250)];
    expect(summarizeSharingBudget(BALANCES, expenses, "u1").totalSpent).toBe(1250);
  });

  it("uses 0 when the budget has no expenses", () => {
    expect(summarizeSharingBudget(BALANCES, undefined, "u1").totalSpent).toBe(0);
    expect(summarizeSharingBudget(BALANCES, [], "u1").totalSpent).toBe(0);
  });
});

describe("useSharingBudgetSummaries", () => {
  it("returns an empty map and fires no requests for an empty id list", () => {
    const { result } = renderHook(() => useSharingBudgetSummaries([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.size).toBe(0);
    expect(sharingService.getBalances).not.toHaveBeenCalled();
    expect(sharingService.listExpenses).not.toHaveBeenCalled();
  });

  it("fires one balances and one expenses request per unique budget", async () => {
    vi.mocked(sharingService.getBalances).mockResolvedValue(BALANCES);
    vi.mocked(sharingService.listExpenses).mockResolvedValue([expense("e1", 1000)]);

    const { result } = renderHook(
      () => useSharingBudgetSummaries(["b1", "b1", "b2"]),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(result.current.get("b1")).toEqual({
        myBalance: -250000,
        totalSpent: 1000,
      }),
    );
    expect(result.current.get("b2")).toEqual({
      myBalance: -250000,
      totalSpent: 1000,
    });
    expect(sharingService.getBalances).toHaveBeenCalledTimes(2);
    expect(sharingService.listExpenses).toHaveBeenCalledTimes(2);
  });

  it("omits budgets whose data failed to load", async () => {
    vi.mocked(sharingService.getBalances).mockRejectedValue(
      new Error("boom"),
    );
    vi.mocked(sharingService.listExpenses).mockResolvedValue([expense("e1", 1000)]);

    const { result } = renderHook(() => useSharingBudgetSummaries(["b1"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(sharingService.getBalances).toHaveBeenCalled());
    expect(result.current.has("b1")).toBe(false);
  });
});
