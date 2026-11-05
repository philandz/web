import { describe, expect, it, vi } from "vitest";
import { sharingService } from "./sharing-service";

// Mock the apiClient module
vi.mock("@/lib/http/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("sharingService.getBalances", () => {
  it("maps snake_case balances JSON to camelCase ParticipantBalance", async () => {
    const { apiClient } = await import("@/lib/http/client");

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      balances: [
        {
          user_id: "u1",
          display_name: "Ann",
          email: "ann@example.com",
          net_balance: -250000,
        },
      ],
    });

    const result = await sharingService.getBalances("budget-1");

    expect(result).toEqual([
      {
        userId: "u1",
        displayName: "Ann",
        email: "ann@example.com",
        netBalance: -250000,
      },
    ]);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/sharing/budgets/budget-1/balances"
    );
  });

  it("coerces a string net_balance to a number", async () => {
    const { apiClient } = await import("@/lib/http/client");

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      balances: [
        {
          user_id: "u1",
          display_name: "Ann",
          email: "ann@example.com",
          net_balance: "-250000",
        },
      ],
    });

    const result = await sharingService.getBalances("budget-1");

    expect(result[0]?.netBalance).toBe(-250000);
  });

  it("falls back to 0 for a non-numeric net_balance", async () => {
    const { apiClient } = await import("@/lib/http/client");

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      balances: [
        {
          user_id: "u1",
          display_name: "Ann",
          email: "ann@example.com",
          net_balance: "not-a-number",
        },
      ],
    });

    const result = await sharingService.getBalances("budget-1");

    expect(result[0]?.netBalance).toBe(0);
  });

  it("returns an empty array when the response has no balances", async () => {
    const { apiClient } = await import("@/lib/http/client");

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const result = await sharingService.getBalances("budget-1");

    expect(result).toEqual([]);
  });
});
