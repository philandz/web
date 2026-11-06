import type { TransactionDraft } from "@/lib/types/transaction-search";
import {
  detectRangeToken,
  parseRangeToken,
  resolveRange,
  validateRange,
  type RangeContext,
  type RangeError,
} from "@/lib/date-range";

/** What the URL cannot tell us: the budget's period and which range to open on. */
export interface QueryContext {
  /** Budget period start day (1..28). Absent for the all-budgets page. */
  periodStartDay?: number;
  /** Token used when the URL has no range. Defaults to the budget period (calendar month if none). */
  defaultRange?: string;
  today?: Date;
}

export const DEFAULT_PAGE_SIZE = 30;
export const PAGE_SIZES = [10, 30, 50, 100];

export function defaultRangeToken(ctx: QueryContext): string {
  return ctx.defaultRange ?? (ctx.periodStartDay ? "period:0" : "month:0");
}

function rangeCtx(ctx: QueryContext): RangeContext {
  return { today: ctx.today, periodStartDay: ctx.periodStartDay };
}

export function draftForRange(base: TransactionDraft, token: string, ctx: QueryContext): TransactionDraft {
  const r = resolveRange(token, rangeCtx(ctx)) ?? { from: "", to: "" };
  return { ...base, range: token, dateFrom: r.from, dateTo: r.to, page: 1 };
}

export function defaultDraft(ctx: QueryContext = {}): TransactionDraft {
  return draftForRange(
    {
      q: "",
      type: "all",
      categoryIds: [],
      memberIds: [],
      range: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "date",
      sortDir: "desc",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    },
    defaultRangeToken(ctx),
    ctx,
  );
}

const TYPES: TransactionDraft["type"][] = ["all", "expense", "income", "transfer"];
const SORTS: TransactionDraft["sortBy"][] = ["date", "amount", "description"];

function ids(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

function intOrUndefined(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
}

/**
 * URL → state. Precedence for the date range: an explicit `from`/`to` (custom), then a `range`
 * token, then the default. Bad values fall back to defaults instead of throwing.
 */
export function parseUrlParams(sp: URLSearchParams, ctx: QueryContext = {}): TransactionDraft {
  const base = defaultDraft(ctx);
  const type = sp.get("type") as TransactionDraft["type"] | null;
  const sort = sp.get("sort") as TransactionDraft["sortBy"] | null;
  const pageSize = Number(sp.get("page_size"));
  const page = Number(sp.get("page"));
  const out: TransactionDraft = {
    ...base,
    q: sp.get("q") ?? "",
    type: type && TYPES.includes(type) ? type : "all",
    categoryIds: ids(sp.get("category_ids")),
    memberIds: ids(sp.get("member_ids")),
    amountMin: intOrUndefined(sp.get("amount_min")),
    amountMax: intOrUndefined(sp.get("amount_max")),
    sortBy: sort && SORTS.includes(sort) ? sort : "date",
    sortDir: sp.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };

  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const token = sp.get("range");
  if (from || to) {
    out.range = "custom";
    out.dateFrom = from;
    out.dateTo = to;
  } else if (token && parseRangeToken(token) && parseRangeToken(token)!.kind !== "custom") {
    const r = resolveRange(token, rangeCtx(ctx)) ?? { from: "", to: "" };
    out.range = token;
    out.dateFrom = r.from;
    out.dateTo = r.to;
  }
  return out;
}

/** State → URL (mutates `sp`). Defaults are dropped so a clean URL means "the default view". */
export function serializeToUrl(applied: TransactionDraft, sp: URLSearchParams, ctx: QueryContext = {}): void {
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "") sp.delete(key);
    else sp.set(key, String(value));
  };

  set("q", applied.q || null);
  set("type", applied.type === "all" ? null : applied.type);
  set("category_ids", applied.categoryIds.join(",") || null);
  set("member_ids", applied.memberIds.join(",") || null);
  set("amount_min", applied.amountMin);
  set("amount_max", applied.amountMax);

  if (applied.range === "custom") {
    set("range", null);
    set("from", applied.dateFrom || null);
    set("to", applied.dateTo || null);
    // an open range is "all"
    if (!applied.dateFrom && !applied.dateTo) set("range", "all");
  } else {
    set("from", null);
    set("to", null);
    set("range", applied.range === defaultRangeToken(ctx) ? null : applied.range);
  }

  set("sort", applied.sortBy === "date" ? null : applied.sortBy);
  set("dir", applied.sortDir === "desc" ? null : applied.sortDir);
  set("page", applied.page === 1 ? null : applied.page);
  set("page_size", applied.pageSize === DEFAULT_PAGE_SIZE ? null : applied.pageSize);
}

export interface DraftValidation {
  ok: boolean;
  errors: Record<string, RangeError | "tooMany" | "amountOrder">;
}

export function validateDraft(draft: TransactionDraft): DraftValidation {
  const errors: DraftValidation["errors"] = {};
  const rangeError = validateRange(draft.dateFrom, draft.dateTo);
  if (rangeError) errors.dateTo = rangeError;
  if (draft.categoryIds.length > 50) errors.categoryIds = "tooMany";
  if (draft.memberIds.length > 50) errors.memberIds = "tooMany";
  if (draft.amountMin != null && draft.amountMax != null && draft.amountMin > draft.amountMax) {
    errors.amountMax = "amountOrder";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Number of real filters (the "Filters (n)" badge). View settings never count: sort, page, page
 * size, and the date range, which always shows on its own trigger.
 */
export function countActiveFilters(applied: TransactionDraft): number {
  let count = 0;
  if (applied.q) count++;
  if (applied.type !== "all") count++;
  if (applied.categoryIds.length > 0) count++;
  if (applied.memberIds.length > 0) count++;
  if (applied.amountMin != null || applied.amountMax != null) count++;
  return count;
}

/** True when anything differs from the default view, the date range included. */
export function isDefaultView(applied: TransactionDraft, ctx: QueryContext = {}): boolean {
  const d = defaultDraft(ctx);
  return (
    countActiveFilters(applied) === 0 &&
    applied.dateFrom === d.dateFrom &&
    applied.dateTo === d.dateTo
  );
}

export { detectRangeToken };
