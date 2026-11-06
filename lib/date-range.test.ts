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
