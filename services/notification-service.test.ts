import { describe, expect, it } from "vitest";

import { mapBanner, mapBroadcast, mapItem, safeLink } from "./notification-service";

describe("safeLink", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeLink("/budgets/1/debts")).toBe("/budgets/1/debts");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil", "javascript:alert(1)", ""])(
    "drops %s",
    (l) => expect(safeLink(l)).toBe("")
  );
});

describe("mapItem", () => {
  it("fills defaults and sanitises the link", () => {
    const item = mapItem({
      id: "n1",
      kind: "personal",
      category: "reminder",
      severity: "warning",
      type: "debt.payment_due",
      created_at: 10,
      link: "https://evil.test",
    });
    expect(item.link).toBe("");
    expect(item.params).toEqual({});
    expect(item.groupCount).toBe(1);
    expect(item.isRead).toBe(false);
  });

  it("keeps group_count above one", () => {
    expect(
      mapItem({
        id: "n",
        kind: "personal",
        category: "activity",
        severity: "info",
        type: "x",
        created_at: 1,
        group_count: 4,
      }).groupCount
    ).toBe(4);
  });
});

describe("mapBanner", () => {
  it("never lets a critical banner be dismissed", () => {
    expect(
      mapBanner({ broadcast_id: "b", severity: "critical", title: "t", body: "b", dismissible: true })
        .dismissible
    ).toBe(false);
  });
});

describe("mapBroadcast", () => {
  it("maps snake_case to camelCase", () => {
    const b = mapBroadcast({
      id: "b1",
      audience: "all",
      severity: "info",
      status: "draft",
      title_vi: "Xin chào",
      show_banner: true,
    });
    expect(b.titleVi).toBe("Xin chào");
    expect(b.showBanner).toBe(true);
    expect(b.audienceUserIds).toEqual([]);
  });
});
