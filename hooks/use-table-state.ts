import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface TableState<TRow, TFilter extends Record<string, string>> {
  // raw
  rows: TRow[];
  // search
  query: string;
  setQuery: (q: string) => void;
  // sort
  sortKey: keyof TRow | null;
  sortDir: SortDir;
  toggleSort: (key: keyof TRow) => void;
  // filter
  filters: TFilter;
  setFilter: (key: keyof TFilter, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  // pagination
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  totalPages: number;
  totalRows: number;
  // result
  paged: TRow[];
}

interface Options<TRow, TFilter extends Record<string, string>> {
  data: TRow[];
  /** Return a string to search against for a given row. */
  searchFn: (row: TRow, query: string) => boolean;
  /** Return true if the row passes all active filters. */
  filterFn: (row: TRow, filters: TFilter) => boolean;
  /** Compare two rows for sorting. */
  sortFn: (a: TRow, b: TRow, key: keyof TRow, dir: SortDir) => number;
  defaultFilters: TFilter;
  defaultPageSize?: number;
}

export function useTableState<TRow, TFilter extends Record<string, string>>(
  opts: Options<TRow, TFilter>
): TableState<TRow, TFilter> {
  const { data, searchFn, filterFn, sortFn, defaultFilters, defaultPageSize = 20 } = opts;

  const [query, setQueryRaw] = useState("");
  const [sortKey, setSortKey] = useState<keyof TRow | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<TFilter>(defaultFilters);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  function setQuery(q: string) {
    setQueryRaw(q);
    setPageRaw(1);
  }

  function toggleSort(key: keyof TRow) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPageRaw(1);
  }

  function setFilter(key: keyof TFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageRaw(1);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setPageRaw(1);
  }

  function setPage(p: number) {
    setPageRaw(p);
  }

  function setPageSize(s: number) {
    setPageSizeRaw(s);
    setPageRaw(1);
  }

  const filtered = useMemo(() => {
    let result = data;
    if (query.trim()) result = result.filter((r) => searchFn(r, query.trim().toLowerCase()));
    result = result.filter((r) => filterFn(r, filters));
    if (sortKey) {
      result = [...result].sort((a, b) => sortFn(a, b, sortKey, sortDir));
    }
    return result;
  }, [data, query, filters, sortKey, sortDir, searchFn, filterFn, sortFn]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => v !== defaultFilters[k]);

  return {
    rows: data,
    query,
    setQuery,
    sortKey,
    sortDir,
    toggleSort,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    page: safePage,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    totalRows,
    paged,
  };
}
