import type { TransactionDraft } from "@/lib/types/transaction-search";

export const DEFAULT_DRAFT: TransactionDraft = {
  q: "",
  type: "all",
  categoryIds: [],
  memberIds: [],
  dateFrom: "",
  dateTo: "",
  sortBy: "date",
  sortDir: "desc",
  page: 1,
  pageSize: 30,
};

export function defaultDraft(): TransactionDraft {
  return { ...DEFAULT_DRAFT };
}

/**
 * Read URL search params → applied state.
 * Omits default values to keep URL clean.
 */
export function parseUrlParams(sp: URLSearchParams): TransactionDraft {
  return {
    q: sp.get("q") ?? "",
    type: (sp.get("type") as TransactionDraft["type"]) ?? "all",
    categoryIds: sp.get("categories") ? sp.get("categories")!.split(",").filter(Boolean) : [],
    memberIds: sp.get("members") ? sp.get("members")!.split(",").filter(Boolean) : [],
    dateFrom: sp.get("from") ?? "",
    dateTo: sp.get("to") ?? "",
    sortBy: (sp.get("sort") as TransactionDraft["sortBy"]) ?? "date",
    sortDir: (sp.get("dir") as TransactionDraft["sortDir"]) ?? "desc",
    page: Number(sp.get("page") || "1") || 1,
    pageSize: Number(sp.get("page_size") || "30") || 30,
  };
}

/**
 * Write applied state → URL search params (mutates sp in place).
 * Drops canonical defaults so the URL stays clean.
 */
export function serializeToUrl(applied: TransactionDraft, sp: URLSearchParams): void {
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === "") {
      sp.delete(key);
    } else {
      sp.set(key, String(value));
    }
  };

  set("q", applied.q || null);
  set("type", applied.type === "all" ? null : applied.type);
  set("categories", applied.categoryIds.join(",") || null);
  set("members", applied.memberIds.join(",") || null);
  set("from", applied.dateFrom || null);
  set("to", applied.dateTo || null);
  set("sort", applied.sortBy === "date" ? null : applied.sortBy);
  set("dir", applied.sortDir === "desc" ? null : applied.sortDir);
  set("page", applied.page === 1 ? null : applied.page);
  set("page_size", applied.pageSize === 30 ? null : applied.pageSize);
}

/**
 * Validate a draft before applying.
 * Returns { ok: true } or { ok: false, errors }.
 */
export function validateDraft(draft: TransactionDraft): {
  ok: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Date range: max 30 days
  if (draft.dateFrom && draft.dateTo) {
    const from = new Date(draft.dateFrom);
    const to = new Date(draft.dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      errors.dateFrom = "Invalid date format";
    } else if (to < from) {
      errors.dateTo = "End date must be after start date";
    } else if (isDateRangeTooWide(draft.dateFrom, draft.dateTo)) {
      errors.dateTo = "Maximum selectable range is 30 days.";
    }
  } else if (draft.dateFrom) {
    const from = new Date(draft.dateFrom);
    if (isNaN(from.getTime())) {
      errors.dateFrom = "Invalid date format";
    }
  } else if (draft.dateTo) {
    const to = new Date(draft.dateTo);
    if (isNaN(to.getTime())) {
      errors.dateTo = "Invalid date format";
    }
  }

  // ID count limits
  if (draft.categoryIds.length > 50) {
    errors.categoryIds = "Maximum 50 categories allowed.";
  }
  if (draft.memberIds.length > 50) {
    errors.memberIds = "Maximum 50 members allowed.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Count how many applied filters differ from their defaults.
 * Used for the "Filters (n)" badge.
 */
export function isDateRangeTooWide(from: string, to: string, maxDays = 30): boolean {
  if (!from || !to) return false;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / msPerDay) > maxDays;
}

/**
 * Returns { from, to } for the current calendar month (first day → today).
 */
export function getCurrentMonthRange(): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmtYmd = (d: Date) => d.toISOString().split("T")[0];
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: fmtYmd(firstOfMonth), to: fmtYmd(today) };
}

/**
 * Returns { from, to } for a preset, or null for "custom".
 */
export function getPresetRange(
  preset: "today" | "last7Days" | "thisMonth" | "custom",
): { from: string; to: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmtYmd = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: fmtYmd(today), to: fmtYmd(today) };
    case "last7Days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: fmtYmd(from), to: fmtYmd(today) };
    }
    case "thisMonth":
      return getCurrentMonthRange();
    case "custom":
      return null;
  }
}

export function countActiveFilters(applied: TransactionDraft): number {
  let count = 0;
  if (applied.q) count++;
  if (applied.type !== "all") count++;
  if (applied.categoryIds.length > 0) count++;
  if (applied.memberIds.length > 0) count++;
  if (applied.dateFrom) count++;
  if (applied.dateTo) count++;
  if (applied.sortBy !== "date") count++;
  if (applied.sortDir !== "desc") count++;
  if (applied.page !== 1) count++;
  if (applied.pageSize !== 30) count++;
  return count;
}
