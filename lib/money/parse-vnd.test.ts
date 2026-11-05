import { describe, expect, it } from "vitest";
import { parseVnd } from "./parse-vnd";

describe("parseVnd", () => {
  it.each([
    ["50k", 50_000],
    ["50K", 50_000],
    ["2m", 2_000_000],
    ["2tr", 2_000_000],
    ["1tr5", 1_500_000],
    ["1.5tr", 1_500_000],
    ["1,5tr", 1_500_000],
    ["1tỷ5", 1_500_000_000],
    ["120000", 120_000],
    ["120.000", 120_000],
    ["1,200,000", 1_200_000],
    ["  75k ₫", 75_000],
  ])("%s -> %d", (input, expected) => {
    expect(parseVnd(input)).toBe(expected);
  });

  it.each(["", "abc", "12x", "1.5.5tr", "tr"])("rejects %j", (input) => {
    expect(parseVnd(input)).toBeNull();
  });
});
