import { describe, expect, it } from "vitest";
import { detectDatePreset, formatLocalYmd, getCurrentMonthRange } from "./date-range";

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
