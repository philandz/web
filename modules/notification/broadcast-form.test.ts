import { describe, expect, it } from "vitest";

import { parseUserIds, validateBroadcast, type BroadcastDraft } from "./broadcast-form";

const OK: BroadcastDraft = {
  audience: "all",
  userIds: "",
  severity: "info",
  titleVi: "Bảo trì",
  bodyVi: "Tối nay",
  titleEn: "Maintenance",
  bodyEn: "Tonight",
  link: "",
  showBanner: false,
};

describe("validateBroadcast", () => {
  it("accepts a complete bilingual broadcast", () => {
    const r = validateBroadcast(OK);
    expect(r.ok).toBe(true);
  });

  it("requires both languages", () => {
    const r = validateBroadcast({ ...OK, titleEn: " ", bodyVi: "" });
    expect(r).toEqual({ ok: false, errors: ["titles", "bodies"] });
  });

  it.each(["https://evil.test", "//evil.test", "/a\\b", "javascript:1"])("rejects link %s", (link) => {
    expect(validateBroadcast({ ...OK, link })).toEqual({ ok: false, errors: ["link"] });
  });

  it("accepts a relative link", () => {
    expect(validateBroadcast({ ...OK, link: "/budgets" }).ok).toBe(true);
  });

  it("requires valid user ids for a user audience", () => {
    expect(validateBroadcast({ ...OK, audience: "users", userIds: "" })).toEqual({ ok: false, errors: ["users"] });
    expect(validateBroadcast({ ...OK, audience: "users", userIds: "not-a-uuid" })).toEqual({
      ok: false,
      errors: ["users"],
    });
    const id = "ef4a838b-0fad-4c1f-ac92-0f0a2ffaaaa9";
    const r = validateBroadcast({ ...OK, audience: "users", userIds: `${id}, ${id}` });
    expect(r.ok && r.input.audienceUserIds).toEqual([id, id]);
  });
});

describe("parseUserIds", () => {
  it("splits on commas and whitespace", () => {
    expect(parseUserIds("a, b\nc;d")).toEqual(["a", "b", "c", "d"]);
  });
});
