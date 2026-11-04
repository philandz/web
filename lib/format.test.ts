import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatCurrency", () => {
  it("writes VND the Vietnamese way whatever the UI locale", () => {
    expect(norm(formatCurrency(3_000_000, "VND", "en"))).toBe("3.000.000 ₫");
    expect(norm(formatCurrency(3_000_000, "VND", "vi"))).toBe("3.000.000 ₫");
  });

  it("formats other currencies in the active locale", () => {
    expect(formatCurrency(1234, "USD", "en")).toBe("$1,234");
  });
});
