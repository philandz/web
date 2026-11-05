import { describe, expect, it } from "vitest";
import { coerceCurrency, currencyOptionsFor } from "./create-rules";

describe("create budget currency rules", () => {
  it("restricts sharing to VND", () => {
    expect(currencyOptionsFor("sharing")).toEqual(["VND"]);
    expect(coerceCurrency("sharing", "USD")).toBe("VND");
  });
  it("keeps the chosen currency for other types", () => {
    expect(coerceCurrency("standard", "USD")).toBe("USD");
    expect(currencyOptionsFor("saving")).toContain("EUR");
  });
});
