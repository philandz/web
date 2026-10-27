import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/services/portfolio-service", () => ({
  portfolioService: {
    getFundSummary: vi.fn(),
  },
}));

import { portfolioService } from "@/services/portfolio-service";
import { useFundSummaries } from "@/modules/portfolio/hooks";
import type { FundSummary } from "@/services/portfolio-service";

const SUMMARY: FundSummary = {
  budgetId: "b1",
  currency: "VND",
  cashBalance: 1000,
  holdingsValue: 2000,
  totalValue: 3000,
  netContributed: 2500,
  growth: 500,
  growthPct: 20,
};

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
});

describe("useFundSummaries", () => {
  it("returns an empty map and fires no requests for an empty id list", () => {
    const { result } = renderHook(() => useFundSummaries([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.size).toBe(0);
    expect(portfolioService.getFundSummary).not.toHaveBeenCalled();
  });

  it("loads one fund summary per unique budget", async () => {
    vi.mocked(portfolioService.getFundSummary).mockResolvedValue(SUMMARY);

    const { result } = renderHook(() => useFundSummaries(["b1", "b1"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.get("b1")).toEqual(SUMMARY));
    expect(portfolioService.getFundSummary).toHaveBeenCalledTimes(1);
    expect(portfolioService.getFundSummary).toHaveBeenCalledWith("b1");
  });

  it("omits budgets whose summary failed to load", async () => {
    vi.mocked(portfolioService.getFundSummary).mockRejectedValue(
      new Error("boom"),
    );

    const { result } = renderHook(() => useFundSummaries(["b1"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(portfolioService.getFundSummary).toHaveBeenCalled(),
    );
    expect(result.current.has("b1")).toBe(false);
  });
});
