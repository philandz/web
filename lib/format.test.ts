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

import { formatCompactMoney, formatDate, formatIsoDate, formatShortDate, parseIsoDate } from "./format";

describe("dates", () => {
  it("never shifts a date-only value by a day", () => {
    const d = parseIsoDate("2026-11-04")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 4]);
  });
  it("writes full dates unambiguously", () => {
    expect(formatIsoDate("2026-11-04", "vi")).toBe("04/11/2026");
    expect(formatIsoDate("2026-11-04", "en")).toBe("Nov 4, 2026");
    expect(formatDate(new Date(2026, 0, 9), "vi")).toBe("09/01/2026");
  });
  it("drops the year for dates in the current year", () => {
    const now = new Date(2026, 10, 5);
    expect(formatShortDate("2026-11-04", "vi", now)).toBe("04/11");
    expect(formatShortDate("2026-11-04", "en", now)).toBe("Nov 4");
    expect(formatShortDate("2027-01-15", "vi", now)).toBe("15/01/2027");
  });
});

describe("formatCompactMoney", () => {
  it("uses Vietnamese units for VND", () => {
    expect(formatCompactMoney(3_213_014, "VND", "vi")).toBe("3,2 tr");
    expect(formatCompactMoney(650_000, "VND", "vi")).toBe("650K");
    expect(formatCompactMoney(1_500_000_000, "VND", "vi")).toBe("1,5 tỷ");
    expect(formatCompactMoney(-4_700_000, "VND", "vi")).toBe("−4,7 tr");
  });
  it("uses M/K in English", () => {
    expect(formatCompactMoney(3_200_000, "VND", "en")).toBe("₫3.2M");
    expect(formatCompactMoney(180_000, "VND", "en")).toBe("₫180K");
  });
});
