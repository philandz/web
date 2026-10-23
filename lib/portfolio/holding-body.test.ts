import { describe, expect, it } from "vitest";
import { buildHoldingBody, isoToEpochSeconds, validateHolding, type HoldingFormValues } from "./holding-body";

const base: HoldingFormValues = {
  kind: "fixed-deposit",
  displayName: " FD 12m ",
  currency: "VND",
  provider: "VCB",
  amount: 1_000_000,
  annualRate: 6,
  date: "2026-10-23",
  maturityDate: "2027-10-23",
  fundingSource: "cash-pocket",
  idempotencyKey: "k1",
};

describe("buildHoldingBody", () => {
  it("builds a fixed deposit with snake_case keys and numeric enums", () => {
    const b = buildHoldingBody(base);
    expect(b).toMatchObject({
      display_name: "FD 12m",
      principal: 1_000_000,
      annual_rate: 6,
      interest_method: 1,
      funding_source: 1,
      idempotency_key: "k1",
    });
    expect(b.deposit_date).toBe(isoToEpochSeconds("2026-10-23"));
    expect(b.maturity_date).toBe(isoToEpochSeconds("2027-10-23"));
  });

  it("maps external funding to 2", () => {
    expect(buildHoldingBody({ ...base, fundingSource: "external" }).funding_source).toBe(2);
  });

  it("builds a gold lot", () => {
    const b = buildHoldingBody({ ...base, kind: "gold-lot", quantity: "2", goldUnit: "luong", pricePerUnit: 80_000_000, fees: 0 });
    expect(b).toMatchObject({ quantity_original: "2", unit_original: 2, purchase_price_per_unit_original: 80_000_000 });
  });
});

describe("validateHolding", () => {
  it("requires a name, positive amount and a later maturity", () => {
    expect(validateHolding({ ...base, displayName: " " })).toBe("name");
    expect(validateHolding({ ...base, amount: 0 })).toBe("amount");
    expect(validateHolding({ ...base, maturityDate: "2026-10-23" })).toBe("maturity");
    expect(validateHolding(base)).toBeNull();
  });
  it("requires quantity and price for gold", () => {
    expect(validateHolding({ ...base, kind: "gold-lot", quantity: "0" })).toBe("quantity");
    expect(validateHolding({ ...base, kind: "gold-lot", quantity: "1", pricePerUnit: 1 })).toBeNull();
  });
});
