import { describe, expect, it } from "vitest";
import {
  camelToSnake,
  camelToSnakeKey,
  snakeToCamel,
  snakeToCamelKey,
} from "./wire-casing";

describe("wire-casing", () => {
  it("converts keys", () => {
    expect(snakeToCamelKey("total_current_value")).toBe("totalCurrentValue");
    expect(snakeToCamelKey("budget_id")).toBe("budgetId");
    expect(camelToSnakeKey("counterpartyBudgetId")).toBe("counterparty_budget_id");
    expect(camelToSnakeKey("amountMinor")).toBe("amount_minor");
    expect(camelToSnakeKey("idempotencyKey")).toBe("idempotency_key");
  });

  it("maps a fund summary response", () => {
    const raw = {
      budget_id: "b-1",
      currency: "VND",
      cash_balance: 100,
      holdings_value: 200,
      total_value: 300,
      net_contributed: 250,
      growth: 50,
      growth_pct: 0.2,
      allocation: [{ label: "Cash", value: 100, pct: 0.33 }],
      upcoming: [{ asset_id: "a-1", display_name: "Gold", maturity_date: 10, expected_amount: 5 }],
    };
    expect(snakeToCamel<Record<string, unknown>>(raw)).toEqual({
      budgetId: "b-1",
      currency: "VND",
      cashBalance: 100,
      holdingsValue: 200,
      totalValue: 300,
      netContributed: 250,
      growth: 50,
      growthPct: 0.2,
      allocation: [{ label: "Cash", value: 100, pct: 0.33 }],
      upcoming: [{ assetId: "a-1", displayName: "Gold", maturityDate: 10, expectedAmount: 5 }],
    });
  });

  it("maps a request body", () => {
    expect(
      camelToSnake({
        counterpartyBudgetId: "std-1",
        amountMinor: 2000000,
        occurredOn: "2026-10-27",
        note: "nap tien",
        idempotencyKey: "k-1",
      }),
    ).toEqual({
      counterparty_budget_id: "std-1",
      amount_minor: 2000000,
      occurred_on: "2026-10-27",
      note: "nap tien",
      idempotency_key: "k-1",
    });
  });

  it("drops undefined values instead of sending them", () => {
    expect(camelToSnake({ note: undefined, amountMinor: 5 })).toEqual({ amount_minor: 5 });
  });

  it("leaves primitives and JSON strings untouched", () => {
    expect(snakeToCamel("a_string")).toBe("a_string");
    expect(snakeToCamel(42)).toBe(42);
    expect(snakeToCamel(null)).toBeNull();
    const payload = '{"some_key":1}';
    expect(snakeToCamel({ payloadJson: payload })).toEqual({ payloadJson: payload });
  });

  it("converts nested arrays of objects", () => {
    const out = snakeToCamel<{ legs: { userId: string }[] }>({
      legs: [{ user_id: "u-1" }, { user_id: "u-2" }],
    });
    expect(out.legs[0].userId).toBe("u-1");
    expect(out.legs[1].userId).toBe("u-2");
  });
});
