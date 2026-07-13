"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { DateRangeFilter, EnumFilter, FilterBadge, Pagination, StatusChip } from "@/components/philand/data-table";
import { TransactionDetailDrawer } from "@/components/philand/transaction-detail-drawer";
import { TransactionFormDrawer } from "@/components/philand/transaction-form-drawer";
import { QuickAddDrawer } from "@/components/philand/quick-add-drawer";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/state/toast-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBulkTransactionMutation, useTransactionsQuery } from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { TransactionApplied, TransactionDraft } from "@/lib/types/transaction-search";
import { useQueryForm } from "@/hooks/use-query-form";
import {
  countActiveFilters,
  defaultDraft,
  parseUrlParams,
  serializeToUrl,
  validateDraft,
} from "@/lib/query-params/transactions";
import type { Transaction, TransactionListParams } from "@/services/transaction-service";
import { transactionKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/navigation";

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

// ---------------------------------------------------------------------------
// Date range presets
// ---------------------------------------------------------------------------

type DatePreset = "today" | "last7Days" | "thisMonth" | "custom";

function getPresetRange(preset: DatePreset): { from: string; to: string } | null {
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
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmtYmd(from), to: fmtYmd(today) };
    }
    case "custom":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Member multi-select (wraps SelectNative with multi)
// ---------------------------------------------------------------------------

function MemberMultiSelect({
  value,
  onChange,
  members,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  members: { userId: string; displayName: string; avatar?: string | null }[];
}) {
  const t = useTranslations("budget.transactions");

  return (
    <SelectNative
      value={value[0] ?? ""}
      onValueChange={(v) => {
        if (!v) {
          onChange([]);
        } else if (value.includes(v)) {
          onChange(value.filter((id) => id !== v));
        } else {
          onChange([...value, v]);
        }
      }}
      className="w-full sm:w-44"
    >
      <option value="">{t("allMembers")}</option>
      {members.map((m) => (
        <option key={m.userId} value={m.userId}>
          {m.displayName}
        </option>
      ))}
    </SelectNative>
  );
}

// ---------------------------------------------------------------------------
// Category multi-select
// ---------------------------------------------------------------------------

function CategoryMultiSelect({
  value,
  onChange,
  categories,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("budget.transactions");

  return (
    <SelectNative
      value={value[0] ?? ""}
      onValueChange={(v) => {
        if (!v) {
          onChange([]);
        } else if (value.includes(v)) {
          onChange(value.filter((id) => id !== v));
        } else {
          onChange([...value, v]);
        }
      }}
      className="w-full sm:w-44"
    >
      <option value="">{t("allCategories")}</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectNative>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TransactionsTabProps {
  budgetId: string;
  budgetIds?: string[];
  currency?: string;
  showBudgetFilter?: boolean;
  persistFiltersInUrl?: boolean;
}

export function TransactionsTab({
  budgetId,
  budgetIds,
  currency = "VND",
  showBudgetFilter = false,
  persistFiltersInUrl = true,
}: TransactionsTabProps) {
  const t = useTranslations("budget.transactions");
  const tBudget = useTranslations("budget.transactions");
  const toast = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ── Query form state (draft / applied) ─────────────────────────────────
  const { draft, applied, setDraft, applySearch, resetDraft, hydrateFromUrl, hasDraftChanges } =
    useQueryForm<TransactionDraft>({
      defaultFactory: defaultDraft,
      parseUrl: parseUrlParams,
      serialize: serializeToUrl,
      validate: validateDraft,
    });

  // Hydrate from URL on first render and on browser back/forward
  useEffect(() => {
    hydrateFromUrl();
    // Only on searchParams change (back/forward navigation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── React Query ─────────────────────────────────────────────────────────
  const queryParams: TransactionListParams = useMemo(
    () => ({
      budgetId: budgetId || undefined,
      budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
      q: applied.q || undefined,
      type: applied.type === "all" ? undefined : (applied.type as TransactionListParams["type"]),
      categoryIds: applied.categoryIds.length > 0 ? applied.categoryIds : undefined,
      memberIds: applied.memberIds.length > 0 ? applied.memberIds : undefined,
      dateFrom: applied.dateFrom || undefined,
      dateTo: applied.dateTo || undefined,
      sortBy: applied.sortBy,
      sortDir: applied.sortDir,
      page: applied.page,
      pageSize: applied.pageSize,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applied, budgetId, budgetIds],
  );

  const { data, isLoading, isError } = useTransactionsQuery(queryParams);

  const { data: categories = [] } = useCategoriesQuery(budgetId || null);
  const { data: members = [] } = useBudgetMembersQuery(budgetId || null);
  const profile = useAuthStore((s) => s.profile);
  const bulkMutation = useBulkTransactionMutation();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, { name: c.name, color: c.color, icon: c.icon }])),
    [categories],
  );

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members],
  );

  const transactions = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 30, totalPages: 1, totalRows: 0 };

  // ── Derived UI state ────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => countActiveFilters(applied), [applied]);

  // Summary totals (client-side over the current page, per spec)
  const filteredIncome = useMemo(
    () => transactions.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0),
    [transactions],
  );
  const filteredExpense = useMemo(
    () => transactions.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0),
    [transactions],
  );

  // ── Local UI state ──────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleSearch() {
    const result = applySearch();
    if (!result.ok) {
      // Surface validation error as toast
      const firstError = Object.values(result.errors)[0];
      if (firstError) toast.error(firstError);
    }
  }

  function handleRefresh() {
    // Re-apply current URL without draft mutation
    hydrateFromUrl();
    // Refetch by forcing page to 1 and re-applying (URL is the source of truth)
    const sp = new URLSearchParams(searchParams.toString());
    const fresh = parseUrlParams(sp);
    setDraft(fresh);
    // Directly trigger a re-render that React Query will pick up via query key
    startTransition(() => {
      router.replace(window.location.search ? `${pathname}?${sp.toString()}` : pathname, {
        scroll: false,
      });
    });
  }

  function handlePageChange(p: number) {
    setDraft({ page: p });
    const next = { ...applied, page: p };
    const sp = new URLSearchParams(searchParams.toString());
    serializeToUrl(next, sp);
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
    });
  }

  function handlePageSizeChange(s: number) {
    setDraft({ pageSize: s, page: 1 });
    const next = { ...applied, pageSize: s, page: 1 };
    const sp = new URLSearchParams(searchParams.toString());
    serializeToUrl(next, sp);
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
    });
  }

  function handleClearFilters() {
    const fresh = defaultDraft();
    setDraft(fresh);
    const sp = new URLSearchParams();
    // Clear tab only, keep budget id in URL if needed
    serializeToUrl(fresh, sp);
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
    });
  }

  function handleSort(key: TransactionDraft["sortBy"]) {
    const newDir = applied.sortBy === key && applied.sortDir === "desc" ? "asc" : "desc";
    setDraft({ sortBy: key, sortDir: newDir });
    const next: TransactionApplied = { ...applied, sortBy: key, sortDir: newDir as "asc" | "desc" };
    const sp = new URLSearchParams(searchParams.toString());
    serializeToUrl(next, sp);
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((tx) => tx.id)));
    }
  }

  function handleBulkDelete() {
    bulkMutation.mutate(
      { kind: "delete", ids: Array.from(selected) },
      {
        onSuccess: () => {
          toast.success(t("bulkDeleteSuccess"));
          setSelected(new Set());
        },
        onError: () => toast.error(t("bulkDeleteError")),
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  // Build a summary of filters that differ between draft and applied (for "Edited" pills)
  const editedFields = useMemo(() => {
    const edited: string[] = [];
    if (draft.q !== applied.q) edited.push("q");
    if (draft.type !== applied.type) edited.push("type");
    if (JSON.stringify(draft.categoryIds) !== JSON.stringify(applied.categoryIds)) edited.push("categoryIds");
    if (JSON.stringify(draft.memberIds) !== JSON.stringify(applied.memberIds)) edited.push("memberIds");
    if (draft.dateFrom !== applied.dateFrom) edited.push("dateFrom");
    if (draft.dateTo !== applied.dateTo) edited.push("dateTo");
    return edited;
  }, [draft, applied]);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Row 1: search + action buttons */}
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft.q}
              onChange={(e) => setDraft({ q: e.target.value })}
              onKeyDown={handleKeyDown}
              className="pl-9"
              placeholder={t("searchPlaceholder")}
            />
          </div>

          {/* Filters toggle (mobile) */}
          <Button
            size="sm"
            variant={filtersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
            className="h-10 w-10 shrink-0 p-0 sm:hidden"
            onClick={() => setFiltersOpen((p) => !p)}
            aria-label="Toggle filters"
          >
            <span className="sr-only">Filters</span>
            <span className="flex h-4 w-4 items-center justify-center text-xs font-semibold">
              {activeFilterCount > 0 ? activeFilterCount : "="}
            </span>
          </Button>

          {/* Add transaction — split button */}
          {budgetId ? (
            <DropdownMenu>
              <div className="flex shrink-0 items-stretch">
                <Button
                  size="sm"
                  className="rounded-r-none border-r border-r-white/20 pr-3"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("addTransaction")}</span>
                </Button>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-l-none px-2">
                    <span className="text-xs">▾</span>
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" className="min-w-[210px]">
                <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("addTransaction")}</div>
                    <div className="text-xs text-muted-foreground">Full form — date, amount, category</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setQuickAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("quickAdd")}</div>
                    <div className="text-xs text-muted-foreground">Spreadsheet — paste or CSV</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {/* Row 2: filter controls — collapsible on mobile */}
        <div
          className={cn(
            "flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
            filtersOpen ? "flex" : "hidden sm:flex",
          )}
        >
          {/* Type: segmented control */}
          <EnumFilter<"all" | "expense" | "income">
            value={draft.type}
            options={[
              { value: "all", label: t("allTypes") },
              { value: "expense", label: t("expense") },
              { value: "income", label: t("income") },
            ]}
            onChange={(v) => setDraft({ type: v ?? "all" })}
            className="w-full sm:w-auto"
          />

          {/* Category multi-select */}
          <CategoryMultiSelect
            value={draft.categoryIds}
            onChange={(ids) => setDraft({ categoryIds: ids })}
            categories={categories}
          />

          {/* Member multi-select */}
          <MemberMultiSelect
            value={draft.memberIds}
            onChange={(ids) => setDraft({ memberIds: ids })}
            members={members}
          />

          {/* Date range */}
          <DateRangeFilter
            from={draft.dateFrom}
            to={draft.dateTo}
            onFrom={(v) => setDraft({ dateFrom: v ?? "" })}
            onTo={(v) => setDraft({ dateTo: v ?? "" })}
            onClear={() => setDraft({ dateFrom: "", dateTo: "" })}
            className="w-full sm:w-auto sm:min-w-[260px]"
          />

          {/* Clear filters link */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* Row 3: Filter counter + action buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Filters (n) counter */}
          {activeFilterCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("filters")} ({activeFilterCount})
            </span>
          )}
          {activeFilterCount === 0 && <span />}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Refresh — re-applies current URL without draft mutation */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              <span className="ml-1.5 hidden sm:inline">{tBudget("refresh")}</span>
            </Button>

            {/* Search — applies draft to URL */}
            <Button size="sm" onClick={handleSearch} disabled={isLoading}>
              <Search className="h-3.5 w-3.5" />
              <span className="ml-1.5 hidden sm:inline">{tBudget("search")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Active filter chips + summary ────────────────────────────────── */}
      {transactions.length > 0 && (
        <div className="space-y-1.5">
          {/* Summary pills */}
          <div className="flex flex-wrap items-center gap-2">
            {filteredIncome > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                ↑ {fmt(filteredIncome, currency)}
              </span>
            )}
            {filteredExpense > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400">
                ↓ {fmt(filteredExpense, currency)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{meta.totalRows} results</span>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {applied.type && applied.type !== "all" && (
              <FilterBadge
                label={applied.type}
                onClear={() => setDraft({ type: "all" })}
              />
            )}
            {applied.categoryIds.map((id) => (
              <FilterBadge
                key={id}
                label={categoryMap.get(id)?.name ?? id}
                onClear={() =>
                  setDraft({ categoryIds: applied.categoryIds.filter((c) => c !== id) })
                }
              />
            ))}
            {applied.memberIds.map((id) => {
              const member = memberMap.get(id);
              return (
                <FilterBadge
                  key={id}
                  label={member?.displayName ?? id}
                  onClear={() =>
                    setDraft({ memberIds: applied.memberIds.filter((m) => m !== id) })
                  }
                />
              );
            })}
            {applied.dateFrom && (
              <FilterBadge
                label={`From ${applied.dateFrom}`}
                onClear={() => setDraft({ dateFrom: "" })}
              />
            )}
            {applied.dateTo && (
              <FilterBadge
                label={`To ${applied.dateTo}`}
                onClear={() => setDraft({ dateTo: "" })}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Bulk action bar ──────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">{selected.size} {t("selected")}</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-destructive text-destructive hover:bg-destructive/10"
            disabled={bulkMutation.isPending}
            onClick={handleBulkDelete}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            {t("bulkDelete")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {t("clearSelection")}
          </Button>
        </div>
      )}

      {/* ── Table / list ────────────────────────────────────────────────── */}
      {isLoading ? (
        <SectionLoadingState rows={5} />
      ) : isError ? (
        <div className="surface-panel flex flex-col items-center gap-2 rounded-2xl px-4 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : transactions.length === 0 ? (
        /* Empty state */
        <div className="surface-panel flex flex-col items-center gap-3 rounded-2xl px-4 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <ReceiptText className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t("empty.title")}</p>
            <p className="text-xs text-muted-foreground">{t("empty.body")}</p>
          </div>
          {activeFilterCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleClearFilters}>
              {t("empty.clear")}
            </Button>
          )}
        </div>
      ) : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === transactions.length && transactions.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      {t("colDate")}
                      {applied.sortBy === "date" && (
                        <span className="text-primary">{applied.sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colType")}
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("description")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      {t("colDescription")}
                      {applied.sortBy === "description" && (
                        <span className="text-primary">{applied.sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colCategory")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("amount")}
                      className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      {t("colAmount")}
                      {applied.sortBy === "amount" && (
                        <span className="text-primary">{applied.sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colTags")}
                  </th>
                  {members.length > 0 && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("colBy")}
                    </th>
                  )}
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="group cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => {
                      setDetailTx(tx);
                      setDetailOpen(true);
                    }}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {fmtDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        value={tx.type}
                        label={tx.type === "income" ? t("income") : t("expense")}
                      />
                    </td>
                    <td className="max-w-[200px] px-4 py-3 font-medium text-foreground">
                      <p className="truncate">{tx.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const cat = categoryMap.get(tx.categoryId ?? "");
                        if (!cat) return <span className="text-muted-foreground">—</span>;
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: `${cat.color}18`,
                              color: cat.color,
                              border: `1px solid ${cat.color}33`,
                            }}
                          >
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                          </span>
                        );
                      })()}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500",
                      )}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {fmt(tx.amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    {members.length > 0 && (() => {
                      const creator = tx.createdBy ? memberMap.get(tx.createdBy) : undefined;
                      return (
                        <td className="px-4 py-3">
                          {creator ? (
                            <UserAvatar
                              name={creator.displayName}
                              src={creator.avatar}
                              size={26}
                              fallbackClassName="text-[10px] font-semibold"
                              className="ring-1 ring-border/50"
                            />
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })()}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 text-muted-foreground">
                        {tx.isRecurring && <RefreshCw className="h-3.5 w-3.5" />}
                        {tx.hasAttachment && <Paperclip className="h-3.5 w-3.5" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-border/40 md:hidden">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                onClick={() => {
                  setDetailTx(tx);
                  setDetailOpen(true);
                }}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    tx.type === "income"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-500",
                  )}
                >
                  {tx.type === "income" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground leading-snug">
                    {tx.description}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {(() => {
                      const creator = tx.createdBy ? memberMap.get(tx.createdBy) : undefined;
                      return creator ? (
                        <UserAvatar
                          name={creator.displayName}
                          src={creator.avatar}
                          size={16}
                          fallbackClassName="text-[8px] font-semibold"
                          className="ring-1 ring-border/50"
                        />
                      ) : null;
                    })()}
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(tx.date)}
                      {categoryMap.get(tx.categoryId ?? "")?.name
                        ? ` · ${categoryMap.get(tx.categoryId ?? "")?.name}`
                        : ""}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    tx.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500",
                  )}
                >
                  {tx.type === "income" ? "+" : "−"}
                  {fmt(tx.amount, currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination footer */}
          <div className="border-t border-border/40 px-4 pb-3 pt-3">
            <Pagination
              page={applied.page}
              totalPages={meta.totalPages}
              totalRows={meta.totalRows}
              pageSize={applied.pageSize}
              onPage={handlePageChange}
              onPageSize={handlePageSizeChange}
              pageSizeOptions={[10, 30, 50, 100]}
            />
          </div>
        </div>
      )}

      {/* ── Drawers ─────────────────────────────────────────────────────── */}
      <TransactionDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailTx(null);
        }}
        transaction={detailTx}
        budgetId={budgetId}
        currency={currency}
      />

      <TransactionFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        budgetId={budgetId}
      />

      {budgetId && (
        <QuickAddDrawer
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          budgetId={budgetId}
          currency={currency}
        />
      )}
    </div>
  );
}
