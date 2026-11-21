import type { InboxItem } from "@/services/notification-service";

export type DayGroup = "today" | "yesterday" | "thisWeek" | "earlier";

const ORDER: DayGroup[] = ["today", "yesterday", "thisWeek", "earlier"];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Which bucket an item falls in, by the viewer's local calendar day. */
export function dayGroup(epochSeconds: number, now = Date.now()): DayGroup {
  const today = startOfDay(now);
  const day = startOfDay(epochSeconds * 1000);
  const days = Math.round((today - day) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "thisWeek";
  return "earlier";
}

/** Splits an already newest-first list into day buckets, keeping the order inside each. */
export function groupByDay(items: InboxItem[], now = Date.now()): { group: DayGroup; items: InboxItem[] }[] {
  const buckets = new Map<DayGroup, InboxItem[]>();
  for (const item of items) {
    const g = dayGroup(item.createdAt, now);
    const list = buckets.get(g) ?? [];
    list.push(item);
    buckets.set(g, list);
  }
  return ORDER.filter((g) => buckets.has(g)).map((g) => ({ group: g, items: buckets.get(g)! }));
}
