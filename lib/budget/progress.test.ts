import { describe, expect, it } from "vitest";
import { progressPct, progressStatus } from "./progress";

describe("progressStatus", () => {
  it("is ok below 80%", () => expect(progressStatus(79, 100)).toBe("ok"));
  it("warns from 80% up to and including 100%", () => {
    expect(progressStatus(80, 100)).toBe("warn");
    expect(progressStatus(100, 100)).toBe("warn");
  });
  it("is over above 100%", () => expect(progressStatus(101, 100)).toBe("over"));
  it("treats spending against a zero plan as over", () => {
    expect(progressStatus(1, 0)).toBe("over");
    expect(progressStatus(0, 0)).toBe("ok");
  });
});

describe("progressPct", () => {
  it("clamps to 0..100", () => {
    expect(progressPct(150, 100)).toBe(100);
    expect(progressPct(-5, 100)).toBe(0);
    expect(progressPct(50, 100)).toBe(50);
  });
});
