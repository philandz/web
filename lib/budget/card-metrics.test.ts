import { describe, expect, it } from "vitest";
import { cardMetricFor } from "./card-metrics";
import type { Budget } from "@/services/budget-service";
import type { FundSummary } from "@/services/portfolio-service";
import type { SharingBudgetSummary } from "@/modules/sharing/hooks";

const b = (over: Partial<Budget> = {}) =>
  ({
    id: "x",
    orgId: "o",
    name: "Budget",
    type: "standard",
    currency: "VND",
    myRole: "owner",
    envelopeLimit: 0,
    burnRatePct: 0,
    currentSpend: 0,
    memberCount: 1,
    totalCurrentValue: 0,
    assetCount: 0,
    createdAt: 0,
    updatedAt: 0,
    periodStartDay: 1,
    timezone: "Asia/Ho_Chi_Minh",
    ...over,
  }) as Budget;

const fund = (over: Partial<FundSummary> = {}): FundSummary => ({
  budgetId: "x",
  currency: "VND",
  cashBalance: 100,
  holdingsValue: 400,
  totalValue: 500,
  netContributed: 450,
  growth: 50,
  growthPct: 0.1111,
  ...over,
});

const sharing = (over: Partial<SharingBudgetSummary> = {}): SharingBudgetSummary => ({
  myBalance: 250_000,
  totalSpent: 3_100_000,
  ...over,
});

describe("cardMetricFor — spend", () => {
  it("reports the spend, the limit and the percentage for a standard budget", () => {
    expect(cardMetricFor(b({ type: "standard", currentSpend: 250, envelopeLimit: 1000 }), {})).toEqual({
      kind: "spend",
      amount: 250,
      limit: 1000,
      pct: 25,
    });
  });

  it("caps the percentage at 100%", () => {
    const m = cardMetricFor(b({ type: "standard", currentSpend: 1500, envelopeLimit: 1000 }), {});
    expect(m.kind).toBe("spend");
    if (m.kind === "spend") expect(m.pct).toBe(100);
  });

  it("treats a zero or negative limit as no limit and falls back to burnRatePct", () => {
    const zero = cardMetricFor(b({ type: "standard", currentSpend: 250, envelopeLimit: 0, burnRatePct: 42 }), {});
    expect(zero).toEqual({ kind: "spend", amount: 250, limit: null, pct: 42 });

    const negative = cardMetricFor(b({ type: "standard", currentSpend: 250, envelopeLimit: -5, burnRatePct: 42 }), {});
    expect(negative).toEqual({ kind: "spend", amount: 250, limit: null, pct: 42 });
  });

  it("has no percentage when the burn rate is unknown", () => {
    expect(
      cardMetricFor(b({ type: "standard", currentSpend: 0, envelopeLimit: 0, burnRatePct: undefined as unknown as number }), {}),
    ).toEqual({
      kind: "spend",
      amount: 0,
      limit: null,
      pct: null,
    });
  });

  it("treats a zero burn rate without a limit as unknown, not 0%", () => {
    expect(cardMetricFor(b({ type: "standard", currentSpend: 0, envelopeLimit: 0, burnRatePct: 0 }), {})).toEqual({
      kind: "spend",
      amount: 0,
      limit: null,
      pct: null,
    });
  });

  it("uses a debt budget like a standard one", () => {
    expect(cardMetricFor(b({ type: "debt", currentSpend: 90, envelopeLimit: 300 }), {})).toEqual({
      kind: "spend",
      amount: 90,
      limit: 300,
      pct: 30,
    });
  });

  it("treats a missing currentSpend as zero", () => {
    const m = cardMetricFor(b({ type: "standard", currentSpend: undefined as unknown as number, envelopeLimit: 100 }), {});
    expect(m.kind === "spend" && m.amount).toBe(0);
  });
});

describe("cardMetricFor — fund", () => {
  it("uses the fund summary value and growth", () => {
    expect(cardMetricFor(b({ type: "saving" }), { fund: fund() })).toEqual({
      kind: "fund",
      amount: 500,
      growthPct: 0.1111,
      currency: "VND",
    });
  });

  it("prefers the fund currency over the budget currency", () => {
    const m = cardMetricFor(b({ type: "saving", currency: "VND" }), { fund: fund({ currency: "USD" }) });
    expect(m.kind === "fund" && m.currency).toBe("USD");
  });

  it("falls back to the budget value and no growth when the summary is missing", () => {
    expect(cardMetricFor(b({ type: "saving", totalCurrentValue: 900 }), {})).toEqual({
      kind: "fund",
      amount: 900,
      growthPct: null,
      currency: "VND",
    });
  });

  it("is zero when neither the summary nor the budget value is known", () => {
    const m = cardMetricFor(b({ type: "saving" }), {});
    expect(m.kind === "fund" && m.amount).toBe(0);
    expect(m.kind === "fund" && m.growthPct).toBeNull();
  });
});

describe("cardMetricFor — sharing", () => {
  it("reports my balance and the total spent", () => {
    expect(cardMetricFor(b({ type: "sharing" }), { sharing: sharing() })).toEqual({
      kind: "sharing",
      myBalance: 250_000,
      totalSpent: 3_100_000,
      currency: "VND",
    });
  });

  it("keeps a negative balance negative", () => {
    const m = cardMetricFor(b({ type: "sharing" }), { sharing: sharing({ myBalance: -120_000 }) });
    expect(m.kind === "sharing" && m.myBalance).toBe(-120_000);
  });

  it("falls back to zero when the summary is missing", () => {
    expect(cardMetricFor(b({ type: "sharing" }), {})).toEqual({
      kind: "sharing",
      myBalance: 0,
      totalSpent: 0,
      currency: "VND",
    });
  });
});

describe("cardMetricFor — saving while the fund flag is off", () => {
  it("shows spend like the ledger its detail page shows", () => {
    const m = cardMetricFor(b({ type: "saving", currentSpend: 500 }), { savingFundOn: false });
    expect(m).toMatchObject({ kind: "spend", amount: 500 });
  });
  it("shows the fund when the flag is on", () => {
    const m = cardMetricFor(b({ type: "saving" }), { savingFundOn: true, fund: fund({ totalValue: 9 }) });
    expect(m).toMatchObject({ kind: "fund", amount: 9 });
  });
});
