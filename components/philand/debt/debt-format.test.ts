import { describe, expect, it } from "vitest";
import { daysUntil, isOverdue, repaidPct } from "./debt-format";

describe("debt format helpers", () => {
  const now = new Date(2026, 10, 4);
  it("counts days to a due date", () => {
    expect(daysUntil("2026-11-04", now)).toBe(0);
    expect(daysUntil("2026-11-10", now)).toBe(6);
    expect(daysUntil("2026-11-01", now)).toBe(-3);
  });
  it("flags only active overdue accounts", () => {
    const due = { dueDate: "2026-11-01" } as never;
    expect(isOverdue({ status: "active", nextDue: due }, now)).toBe(true);
    expect(isOverdue({ status: "settled", nextDue: due }, now)).toBe(false);
    expect(isOverdue({ status: "active", nextDue: null }, now)).toBe(false);
  });
  it("computes the repaid share within 0..100", () => {
    expect(repaidPct({ openingOutstandingMinor: 100, outstandingMinor: 25 })).toBe(75);
    expect(repaidPct({ openingOutstandingMinor: 100, outstandingMinor: 150 })).toBe(0);
    expect(repaidPct({ openingOutstandingMinor: 0, outstandingMinor: 0 })).toBe(0);
  });
});
