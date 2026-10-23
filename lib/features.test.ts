import { describe, expect, it } from "vitest";
import { isFeatureEnabled, parseFlag } from "./features";

describe("feature flags", () => {
  it("parses truthy values only", () => {
    expect(parseFlag("1")).toBe(true);
    expect(parseFlag("true")).toBe(true);
    expect(parseFlag("TRUE")).toBe(true);
    expect(parseFlag("0")).toBe(false);
    expect(parseFlag("")).toBe(false);
    expect(parseFlag(undefined)).toBe(false);
  });
  it("defaults to off when env is unset", () => {
    expect(isFeatureEnabled("transfers")).toBe(false);
  });
});
