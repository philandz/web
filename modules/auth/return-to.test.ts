import { describe, expect, it } from "vitest";

import { sanitizeReturnTo } from "@/modules/auth/return-to";

describe("sanitizeReturnTo", () => {
  it("returns null for empty / nullish input", () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo("")).toBeNull();
    expect(sanitizeReturnTo("   ")).toBeNull();
  });

  it("accepts a plain in-app path", () => {
    expect(sanitizeReturnTo("/en/sharing/abc")).toBe("/en/sharing/abc");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeReturnTo("  /en/sharing/abc  ")).toBe("/en/sharing/abc");
  });

  it("rejects values that do not start with /", () => {
    expect(sanitizeReturnTo("en/sharing/abc")).toBeNull();
    expect(sanitizeReturnTo("sharing/abc")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnTo("//evil.com/x")).toBeNull();
    expect(sanitizeReturnTo("///foo")).toBeNull();
  });

  it("rejects absolute URLs with a scheme", () => {
    expect(sanitizeReturnTo("https://evil.com/x")).toBeNull();
    expect(sanitizeReturnTo("http://evil.com/x")).toBeNull();
    expect(sanitizeReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("rejects paths that smuggle a scheme later", () => {
    expect(sanitizeReturnTo("/foo/https://evil.com")).toBeNull();
  });
});