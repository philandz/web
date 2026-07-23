import type { BudgetRole, BudgetType } from "@/services/budget-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetFilters {
  q?: string;
  type?: BudgetType;
  role?: BudgetRole;
  sortBy?: "name" | "updated_at";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SORT_BY: BudgetFilters["sortBy"] = "updated_at";
export const DEFAULT_SORT_DIR: BudgetFilters["sortDir"] = "desc";

function isValidSortBy(v: string | undefined): v is BudgetFilters["sortBy"] {
  return v === "name" || v === "updated_at";
}

function isValidSortDir(v: string | undefined): v is BudgetFilters["sortDir"] {
  return v === "asc" || v === "desc";
}

function isValidType(v: string | undefined): v is BudgetType {
  return v === "standard" || v === "saving" || v === "debt" || v === "invest" || v === "sharing";
}

function isValidRole(v: string | undefined): v is BudgetRole {
  return v === "owner" || v === "manager" || v === "contributor" || v === "viewer";
}

// ---------------------------------------------------------------------------
// Parse from URL search params
// ---------------------------------------------------------------------------

export function parseBudgetFilters(searchParams: URLSearchParams): BudgetFilters {
  const q = searchParams.get("q") || undefined;
  const type = isValidType(searchParams.get("type") ?? "") ? searchParams.get("type") as BudgetType : undefined;
  const role = isValidRole(searchParams.get("role") ?? "") ? searchParams.get("role") as BudgetRole : undefined;
  const sortBy = isValidSortBy(searchParams.get("sort_by") ?? "") ? searchParams.get("sort_by") as BudgetFilters["sortBy"] : undefined;
  const sortDir = isValidSortDir(searchParams.get("sort_dir") ?? "") ? searchParams.get("sort_dir") as BudgetFilters["sortDir"] : undefined;
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("page_size");

  return {
    q,
    type,
    role,
    sortBy: sortBy ?? DEFAULT_SORT_BY,
    sortDir: sortDir ?? DEFAULT_SORT_DIR,
    page: rawPage ? Math.max(1, Number(rawPage) || DEFAULT_PAGE) : DEFAULT_PAGE,
    pageSize: rawPageSize
      ? Math.max(1, Math.min(100, Number(rawPageSize)))
      : DEFAULT_PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// Serialize to URL search params
// ---------------------------------------------------------------------------

export function serializeBudgetFilters(filters: BudgetFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.role) params.set("role", filters.role);
  if (filters.sortBy && filters.sortBy !== DEFAULT_SORT_BY) params.set("sort_by", filters.sortBy);
  if (filters.sortDir && filters.sortDir !== DEFAULT_SORT_DIR) params.set("sort_dir", filters.sortDir);
  if (filters.page != null && filters.page !== DEFAULT_PAGE) params.set("page", String(filters.page));
  if (filters.pageSize != null && filters.pageSize !== DEFAULT_PAGE_SIZE) params.set("page_size", String(filters.pageSize));
  return params;
}

// ---------------------------------------------------------------------------
// Page reset on filter change
// ---------------------------------------------------------------------------

export function changeBudgetFilter(
  current: BudgetFilters,
  patch: Partial<Omit<BudgetFilters, "page">>
): BudgetFilters {
  return {
    ...current,
    ...patch,
    page: 1, // Always reset to page 1 when filters change
  };
}
