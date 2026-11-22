import { describe, expect, it } from "vitest";

import type { InboxItem } from "@/services/notification-service";

import { dayGroup, groupByDay } from "./group";

const NOW = new Date(2026, 10, 20, 10, 0, 0).getTime(); // 20 Nov 2026, 10:00 local
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).getTime() / 1000;

describe("dayGroup", () => {
  it("buckets by local calendar day", () => {
    expect(dayGroup(at(2026, 10, 20, 0), NOW)).toBe("today");
    expect(dayGroup(at(2026, 10, 19, 23), NOW)).toBe("yesterday");
    expect(dayGroup(at(2026, 10, 15), NOW)).toBe("thisWeek");
    expect(dayGroup(at(2026, 10, 13), NOW)).toBe("earlier");
  });
});

describe("groupByDay", () => {
  it("keeps the bucket order and the order inside a bucket", () => {
    const item = (id: string, createdAt: number) => ({ id, createdAt }) as InboxItem;
    const groups = groupByDay(
      [item("a", at(2026, 10, 20)), item("b", at(2026, 10, 20, 8)), item("c", at(2026, 10, 1))],
      NOW
    );
    expect(groups.map((g) => [g.group, g.items.map((i) => i.id)])).toEqual([
      ["today", ["a", "b"]],
      ["earlier", ["c"]],
    ]);
  });
});
