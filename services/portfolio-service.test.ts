import { describe, expect, it } from "vitest";
import { normalizeFundKind } from "./portfolio-service";

describe("normalizeFundKind", () => {
  it("strips the proto prefix", () => {
    expect(normalizeFundKind("FUND_CASH_MOVEMENT_KIND_TRANSFER_IN")).toBe("TRANSFER_IN");
  });
  it("accepts the short and lower-case forms", () => {
    expect(normalizeFundKind("asset_purchase")).toBe("ASSET_PURCHASE");
  });
  it("falls back to UNSPECIFIED", () => {
    expect(normalizeFundKind(undefined)).toBe("UNSPECIFIED");
    expect(normalizeFundKind("nope")).toBe("UNSPECIFIED");
  });
});
