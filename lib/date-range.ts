export type DatePreset = "today" | "last7Days" | "thisMonth" | "custom";
export type DateRange = { from: string; to: string };

export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthRange(today = new Date()): DateRange {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const first = new Date(localToday.getFullYear(), localToday.getMonth(), 1);
  return { from: formatLocalYmd(first), to: formatLocalYmd(localToday) };
}

export function getPresetRange(
  preset: DatePreset,
  today = new Date(),
): DateRange | null {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  switch (preset) {
    case "today":
      return { from: formatLocalYmd(localToday), to: formatLocalYmd(localToday) };
    case "last7Days": {
      const from = new Date(localToday);
      from.setDate(from.getDate() - 6);
      return { from: formatLocalYmd(from), to: formatLocalYmd(localToday) };
    }
    case "thisMonth":
      return getCurrentMonthRange(localToday);
    case "custom":
      return null;
  }
}

export function detectDatePreset(
  from: string,
  to: string,
  today = new Date(),
): DatePreset | null {
  if (!from || !to) return null;

  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayYmd = formatLocalYmd(localToday);

  // today
  if (from === todayYmd && to === todayYmd) return "today";

  // last 7 days
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 6) {
    const from7 = new Date(localToday);
    from7.setDate(from7.getDate() - 6);
    if (formatLocalYmd(from7) === from) return "last7Days";
  }

  // this month
  const firstOfMonth = new Date(localToday.getFullYear(), localToday.getMonth(), 1);
  if (formatLocalYmd(firstOfMonth) === from && todayYmd === to) return "thisMonth";

  return "custom";
}

// ---------------------------------------------------------------------------
// Range tokens
//
// A token names a range relative to "now" so a shared or bookmarked link keeps meaning "last
// period" next month. All maths is on LOCAL calendar days; never go through toISOString() (UTC).
//
//   today | yesterday | last7 | last30 | all | custom
//   week:N | period:N | month:N | quarter:N | year:N     (N = offset, 0 = current, -1 = previous)
//
// `period:*` follows the budget's own period (start day 1..28, like libs/time/src/period.rs);
// `month:*` is the calendar month. Spans such as a period or a month are returned in full, so a
// range can include days that have not happened yet.
// ---------------------------------------------------------------------------

/** Longest range the API accepts (days between from and to). */
export const MAX_RANGE_DAYS = 366;

export type RangeKind =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "week"
  | "period"
  | "month"
  | "quarter"
  | "year"
  | "all"
  | "custom";

export interface RangeContext {
  today?: Date;
  /** Budget period start day; clamped to 1..28. Defaults to 1. */
  periodStartDay?: number;
}

const OFFSET_KINDS: RangeKind[] = ["week", "period", "month", "quarter", "year"];
const FIXED_KINDS: RangeKind[] = ["today", "yesterday", "last7", "last30", "all", "custom"];

export function parseRangeToken(token: string | null | undefined): { kind: RangeKind; offset: number } | null {
  if (!token) return null;
  const [kind, rest] = token.split(":");
  if ((FIXED_KINDS as string[]).includes(kind) && rest === undefined) {
    return { kind: kind as RangeKind, offset: 0 };
  }
  if ((OFFSET_KINDS as string[]).includes(kind)) {
    const offset = rest === undefined ? 0 : Number(rest);
    if (!Number.isInteger(offset) || Math.abs(offset) > 1200) return null;
    return { kind: kind as RangeKind, offset };
  }
  return null;
}

export function formatRangeToken(kind: RangeKind, offset = 0): string {
  return (OFFSET_KINDS as string[]).includes(kind) ? `${kind}:${offset}` : kind;
}

function localDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Parse "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC midnight). */
export function parseLocalYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
    ? d
    : null;
}

export function clampStartDay(day: number | undefined): number {
  const n = Math.trunc(day ?? 1);
  return Math.min(28, Math.max(1, Number.isFinite(n) ? n : 1));
}

/** Resolve a token to inclusive local dates. `all` is {"",""}; `custom` and bad tokens are null. */
export function resolveRange(token: string, ctx: RangeContext = {}): DateRange | null {
  const p = parseRangeToken(token);
  if (!p) return null;
  const today = localDay(ctx.today ?? new Date());
  const y = today.getFullYear();
  const m = today.getMonth();
  const span = (from: Date, to: Date): DateRange => ({ from: formatLocalYmd(from), to: formatLocalYmd(to) });

  switch (p.kind) {
    case "all":
      return { from: "", to: "" };
    case "custom":
      return null;
    case "today":
      return span(today, today);
    case "yesterday": {
      const d = addDays(today, -1);
      return span(d, d);
    }
    case "last7":
      return span(addDays(today, -6), today);
    case "last30":
      return span(addDays(today, -29), today);
    case "week": {
      const monday = addDays(today, -((today.getDay() + 6) % 7) + 7 * p.offset);
      return span(monday, addDays(monday, 6));
    }
    case "month":
      return span(new Date(y, m + p.offset, 1), new Date(y, m + p.offset + 1, 0));
    case "quarter": {
      const q = Math.floor(m / 3) * 3 + 3 * p.offset;
      return span(new Date(y, q, 1), new Date(y, q + 3, 0));
    }
    case "year":
      return span(new Date(y + p.offset, 0, 1), new Date(y + p.offset, 11, 31));
    case "period": {
      const sd = clampStartDay(ctx.periodStartDay);
      const base = today.getDate() >= sd ? m : m - 1; // month the current period started in
      return span(new Date(y, base + p.offset, sd), new Date(y, base + p.offset + 1, sd - 1));
    }
  }
}

export function resolveRangeOrAll(token: string, ctx: RangeContext = {}): DateRange {
  return resolveRange(token, ctx) ?? { from: "", to: "" };
}

/** The same kind of range one step earlier (-1) or later (+1); null when the token has no step. */
export function shiftRangeToken(token: string, dir: 1 | -1): string | null {
  const p = parseRangeToken(token);
  if (!p || !(OFFSET_KINDS as string[]).includes(p.kind)) return null;
  return formatRangeToken(p.kind, p.offset + dir);
}

/** Move an explicit range by its own length (custom ranges, today, last 7 days…). */
export function shiftExplicitRange(range: DateRange, dir: 1 | -1): DateRange | null {
  const from = parseLocalYmd(range.from);
  const to = parseLocalYmd(range.to);
  if (!from || !to) return null;
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return span2(addDays(from, dir * days), addDays(to, dir * days));
}

function span2(from: Date, to: Date): DateRange {
  return { from: formatLocalYmd(from), to: formatLocalYmd(to) };
}

/** Name the token a pair of dates corresponds to, so an old `from`/`to` link shows a preset label. */
export function detectRangeToken(from: string, to: string, ctx: RangeContext = {}): string {
  if (!from && !to) return "all";
  if (!from || !to) return "custom";
  for (const kind of ["today", "yesterday", "last7", "last30"] as RangeKind[]) {
    const r = resolveRange(kind, ctx);
    if (r && r.from === from && r.to === to) return kind;
  }
  for (const kind of ["month", "period", "week", "quarter", "year"] as RangeKind[]) {
    for (let offset = -12; offset <= 2; offset++) {
      const r = resolveRange(formatRangeToken(kind, offset), ctx);
      if (r && r.from === from && r.to === to) return formatRangeToken(kind, offset);
    }
  }
  return "custom";
}

export function rangeLengthDays(from: string, to: string): number | null {
  const a = parseLocalYmd(from);
  const b = parseLocalYmd(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type RangeError = "invalid" | "order" | "tooWide";

/** null when fine. An empty side means "open" and is allowed (the server paginates). */
export function validateRange(from: string, to: string, maxDays = MAX_RANGE_DAYS): RangeError | null {
  if (from && !parseLocalYmd(from)) return "invalid";
  if (to && !parseLocalYmd(to)) return "invalid";
  if (from && to) {
    const days = rangeLengthDays(from, to)!;
    if (days < 0) return "order";
    if (days > maxDays) return "tooWide";
  }
  return null;
}

/** Cut a too-long range down: keeps `from`, moves `to` to `from + maxDays`. */
export function clampRange(from: string, to: string, maxDays = MAX_RANGE_DAYS): DateRange {
  const a = parseLocalYmd(from);
  if (!a || !to) return { from, to };
  const days = rangeLengthDays(from, to);
  if (days === null || days <= maxDays) return { from, to };
  return span2(a, addDays(a, maxDays));
}
