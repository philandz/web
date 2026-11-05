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

import { balancePath, parsePayload, rateChangeAt } from "./debt-format";

describe("schedule helpers", () => {
  it("detects where the rate changes", () => {
    const rows = [{ annualRate: "8.9" }, { annualRate: "8.9" }, { annualRate: "11.5" }];
    expect([0, 1, 2].map((i) => rateChangeAt(rows, i))).toEqual([false, false, true]);
  });
  it("draws a falling balance line", () => {
    const d = balancePath([100, 50, 0], 100, 50, 0);
    expect(d).toBe("M0.0,0.0 L50.0,25.0 L100.0,50.0");
    expect(balancePath([5], 100, 50)).toBe("");
  });
  it("tolerates broken event payloads", () => {
    expect(parsePayload("{bad")).toEqual({});
    expect(parsePayload('{"a":1}')).toEqual({ a: 1 });
  });
});
