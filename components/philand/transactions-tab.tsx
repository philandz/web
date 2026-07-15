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
import { DateDropdown, FilterBadge, FilterPanel, Pagination, StatusChip, TypePopover } from "@/components/philand/data-table";
import { CategoryPopover, MemberPopover } from "@/components/philand/data-table";
import { TransactionDetailDrawer } from "@/components/philand/transaction-detail-drawer";
import { TransactionFormDrawer } from "@/components/philand/transaction-form-drawer";
import { QuickAddDrawer } from "@/components/philand/quick-add-drawer";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  getCurrentMonthRange,
  isDateRangeTooWide,
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
    // Apply "This Month" if no date params in URL
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("from") && !sp.get("to")) {
      const range = getCurrentMonthRange();
      setDraft({ dateFrom: range.from, dateTo: range.to });
      const d = { ...defaultDraft(), dateFrom: range.from, dateTo: range.to };
      applySearchWithDraft(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Validation
  const validationErrors = useMemo(() => validateDraft(draft).errors, [draft]);
  const isDateRangeValid = !isDateRangeTooWide(draft.dateFrom, draft.dateTo);

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

  // ── applySearchWithDraft ────────────────────────────────────────────────
  function applySearchWithDraft(d: TransactionDraft) {
    const v = validateDraft(d);
    if (!v.ok) {
      toast.error(Object.values(v.errors)[0]);
      return false;
    }
    setDraft(d);
    const sp = new URLSearchParams(window.location.search);
    serializeToUrl(d, sp);
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
    });
    return true;
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

      {/* Row 1: Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={draft.q}
            onChange={(e) => setDraft({ q: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="pl-9"
            placeholder={t("searchPlaceholder")}
          />
        </div>
        {budgetId && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{t("addTransaction")}</span>
          </Button>
        )}
      </div>

      {/* Row 2: FilterPanel + Refresh + Search */}
      <FilterPanel
        open={filtersOpen}
        onToggle={() => setFiltersOpen((p) => !p)}
        activeFilterCount={activeFilterCount}
      >
        {/* Type popover (single-select radio, matches Member/Category pill style) */}
        <TypePopover<"all" | "expense" | "income">
          value={draft.type === "all" ? "all" : (draft.type as "expense" | "income")}
          options={[
            { value: "all" as const, label: t("allTypes") },
            { value: "expense" as const, label: t("expense") },
            { value: "income" as const, label: t("income") },
          ]}
          onChange={(v) => applySearchWithDraft({ ...draft, type: v })}
          labels={{ title: t("filterTypeTitle") ?? "Filter by type", all: t("allTypes") }}
        />

        {/* Member popover */}
        <MemberPopover
          value={draft.memberIds}
          onChange={(ids) => applySearchWithDraft({ ...draft, memberIds: ids })}
          members={members}
        />

        {/* Category popover */}
        <CategoryPopover
          value={draft.categoryIds}
          onChange={(ids) => applySearchWithDraft({ ...draft, categoryIds: ids })}
          categories={categories}
        />

        {/* Date dropdown */}
        <DateDropdown
          from={draft.dateFrom}
          to={draft.dateTo}
          onSelect={(preset) => {
            const range = getPresetRange(preset);
            if (range) {
              applySearchWithDraft({ ...draft, dateFrom: range.from, dateTo: range.to });
            }
          }}
          onCustomChange={(from, to) =>
            applySearchWithDraft({ ...draft, dateFrom: from, dateTo: to })
          }
          validationError={validationErrors.dateTo}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh + Search — right side */}
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          <span className="hidden sm:inline ml-1.5">{t("refresh")}</span>
        </Button>
        <Button size="sm" onClick={handleSearch} disabled={isLoading || !isDateRangeValid}>
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1.5">{t("search")}</span>
        </Button>

        {/* Filter chips — inside expanded panel */}
        {filtersOpen && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {applied.type && applied.type !== "all" && (
              <FilterBadge
                label={applied.type}
                onClear={() =>
                  applySearchWithDraft({ ...draft, type: "all" })
                }
              />
            )}
            {applied.categoryIds.map((id) => (
              <FilterBadge
                key={id}
                label={categoryMap.get(id)?.name ?? id}
                onClear={() =>
                  applySearchWithDraft({
                    ...draft,
                    categoryIds: applied.categoryIds.filter((c) => c !== id),
                  })
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
                    applySearchWithDraft({
                      ...draft,
                      memberIds: applied.memberIds.filter((m) => m !== id),
                    })
                  }
                />
              );
            })}
            {applied.dateFrom && (
              <FilterBadge
                label={`From ${applied.dateFrom}`}
                onClear={() =>
                  applySearchWithDraft({ ...draft, dateFrom: "" })
                }
              />
            )}
            {applied.dateTo && (
              <FilterBadge
                label={`To ${applied.dateTo}`}
                onClear={() =>
                  applySearchWithDraft({ ...draft, dateTo: "" })
                }
              />
            )}
          </div>
        )}
      </FilterPanel>

      {/* Sticky SummaryStrip — above table */}
      {transactions.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-xl border border-border bg-muted/60 backdrop-blur-sm px-4 py-2.5 text-sm">
          {filteredIncome > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              ↑ {fmt(filteredIncome, currency)}
            </span>
          )}
          {filteredExpense > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              ↓ {fmt(filteredExpense, currency)}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {meta.totalRows} result{meta.totalRows !== 1 ? "s" : ""}
          </span>
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
