import { describe, expect, it } from "vitest";
import { detectDatePreset, formatLocalYmd, getCurrentMonthRange, getPresetRange } from "./date-range";

describe("local date ranges", () => {
  it("does not shift local midnight into previous UTC date", () => {
    expect(formatLocalYmd(new Date(2026, 6, 23, 0, 30))).toBe("2026-07-23");
  });

  it("returns July 1 through July 23 for this month", () => {
    expect(getCurrentMonthRange(new Date(2026, 6, 23, 0, 30))).toEqual({
      from: "2026-07-01",
      to: "2026-07-23",
    });
  });

  it("detects this month using local dates", () => {
    expect(detectDatePreset("2026-07-01", "2026-07-23", new Date(2026, 6, 23, 0, 30)))
      .toBe("thisMonth");
  });
});

describe("presets use the local calendar day", () => {
  it("'today' at 00:30 local is that local date, not the UTC day before", () => {
    const now = new Date(2026, 10, 6, 0, 30); // 06/11 00:30 local; 05/11 17:30 UTC in UTC+7
    expect(getPresetRange("today", now)).toEqual({ from: "2026-11-06", to: "2026-11-06" });
    expect(getPresetRange("last7Days", now)).toEqual({ from: "2026-10-31", to: "2026-11-06" });
  });
});

import {
  clampRange,
  detectRangeToken,
  parseRangeToken,
  resolveRange,
  shiftExplicitRange,
  shiftRangeToken,
  validateRange,
} from "./date-range";

describe("range tokens", () => {
  const today = new Date(2026, 10, 6, 0, 30); // Fri 06/11/2026 00:30 local

  it("parses tokens and rejects junk", () => {
    expect(parseRangeToken("period:-1")).toEqual({ kind: "period", offset: -1 });
    expect(parseRangeToken("month")).toEqual({ kind: "month", offset: 0 });
    expect(parseRangeToken("all")).toEqual({ kind: "all", offset: 0 });
    expect(parseRangeToken("today:1")).toBeNull();
    expect(parseRangeToken("month:x")).toBeNull();
    expect(parseRangeToken("")).toBeNull();
  });

  it("resolves the calendar presets", () => {
    expect(resolveRange("yesterday", { today })).toEqual({ from: "2026-11-05", to: "2026-11-05" });
    expect(resolveRange("week:0", { today })).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(resolveRange("week:-1", { today })).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(resolveRange("month:0", { today })).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(resolveRange("month:-1", { today })).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveRange("quarter:0", { today })).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(resolveRange("quarter:-1", { today })).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(resolveRange("year:0", { today })).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(resolveRange("last30", { today })).toEqual({ from: "2026-10-08", to: "2026-11-06" });
    expect(resolveRange("all", { today })).toEqual({ from: "", to: "" });
    expect(resolveRange("custom", { today })).toBeNull();
  });

  it("February in a leap year ends on the 29th", () => {
    expect(resolveRange("month:0", { today: new Date(2028, 1, 10) })).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("follows the budget period start day", () => {
    // start day 25: 06/11 belongs to 25/10 – 24/11
    expect(resolveRange("period:0", { today, periodStartDay: 25 })).toEqual({ from: "2026-10-25", to: "2026-11-24" });
    expect(resolveRange("period:-1", { today, periodStartDay: 25 })).toEqual({ from: "2026-09-25", to: "2026-10-24" });
    expect(resolveRange("period:1", { today, periodStartDay: 25 })).toEqual({ from: "2026-11-25", to: "2026-12-24" });
    // on the start day itself a new period begins
    expect(resolveRange("period:0", { today: new Date(2026, 10, 25), periodStartDay: 25 })).toEqual({
      from: "2026-11-25",
      to: "2026-12-24",
    });
    // start day 1 == calendar month; start day is clamped to 28
    expect(resolveRange("period:0", { today, periodStartDay: 1 })).toEqual(resolveRange("month:0", { today }));
    expect(resolveRange("period:0", { today: new Date(2026, 1, 28), periodStartDay: 31 })).toEqual({
      from: "2026-02-28",
      to: "2026-03-27",
    });
  });

  it("crosses a year boundary", () => {
    const jan = new Date(2027, 0, 10);
    expect(resolveRange("period:0", { today: jan, periodStartDay: 25 })).toEqual({ from: "2026-12-25", to: "2027-01-24" });
    expect(resolveRange("month:-1", { today: jan })).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("steps by kind, or by the range length for explicit ranges", () => {
    expect(shiftRangeToken("period:0", -1)).toBe("period:-1");
    expect(shiftRangeToken("year:-1", 1)).toBe("year:0");
    expect(shiftRangeToken("today", 1)).toBeNull();
    expect(shiftExplicitRange({ from: "2026-11-01", to: "2026-11-10" }, -1)).toEqual({ from: "2026-10-22", to: "2026-10-31" });
    expect(shiftExplicitRange({ from: "2026-11-06", to: "2026-11-06" }, 1)).toEqual({ from: "2026-11-07", to: "2026-11-07" });
  });

  it("names the token behind old from/to links", () => {
    expect(detectRangeToken("2026-11-01", "2026-11-30", { today })).toBe("month:0");
    expect(detectRangeToken("2026-10-25", "2026-11-24", { today, periodStartDay: 25 })).toBe("period:0");
    expect(detectRangeToken("2026-11-06", "2026-11-06", { today })).toBe("today");
    expect(detectRangeToken("2026-11-03", "2026-11-12", { today })).toBe("custom");
    expect(detectRangeToken("", "", { today })).toBe("all");
  });

  it("allows up to 366 days and an open end, refuses 367 and bad dates", () => {
    expect(validateRange("2026-01-01", "2027-01-02")).toBeNull(); // 366 days apart
    expect(validateRange("2026-01-01", "2027-01-03")).toBe("tooWide");
    expect(validateRange("2026-11-10", "2026-11-01")).toBe("order");
    expect(validateRange("2026-13-40", "")).toBe("invalid");
    expect(validateRange("", "")).toBeNull();
    expect(validateRange("2026-01-01", "")).toBeNull();
    expect(clampRange("2026-01-01", "2028-01-01")).toEqual({ from: "2026-01-01", to: "2027-01-02" });
    expect(clampRange("2026-01-01", "2026-02-01")).toEqual({ from: "2026-01-01", to: "2026-02-01" });
  });
});
