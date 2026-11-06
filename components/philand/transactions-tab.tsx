"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
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
import { FilterBadge, Pagination, StatusChip, TypePopover } from "@/components/philand/data-table";
import { DateRangePicker } from "@/components/philand/filters/date-range-picker";
import { SearchBox } from "@/components/philand/filters/search-box";
import { AmountFilter } from "@/components/philand/filters/amount-filter";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useCategoriesForBudgets } from "@/modules/category/hooks";
import { useBudgetMembersQuery, useBudgetQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { TransactionApplied, TransactionDraft } from "@/lib/types/transaction-search";
import { useListQuery } from "@/hooks/use-list-query";
import {
  PAGE_SIZES,
  countActiveFilters,
  defaultDraft,
  draftForRange,
  isDefaultView,
  parseUrlParams,
  serializeToUrl,
  validateDraft,
  type QueryContext,
} from "@/lib/query-params/transactions";
import type { Transaction, TransactionListParams } from "@/services/transaction-service";
import { transactionKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Feature } from "@/components/ui/feature";
import { isFeatureEnabled } from "@/lib/features";
import { TransferDialog } from "./transfer-dialog";
import { amountSign, amountToneClass, iconToneClass, isInflow, isTransferKind } from "@/lib/transaction-kind";
import { formatIsoDate, formatShortDate } from "@/lib/format";
import { usePathname, useRouter } from "@/i18n/navigation";

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return formatShortDate(dateStr);
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
  /** Hide add / transfer / edit / delete — e.g. a Saving fund's legacy history. */
  readOnly?: boolean;
}

export function TransactionsTab({
  budgetId,
  budgetIds,
  currency = "VND",
  showBudgetFilter = false,
  persistFiltersInUrl = true,
  readOnly = false,
}: TransactionsTabProps) {
  const t = useTranslations("budget.transactions");
  const tBudget = useTranslations("budget.transactions");
  const tTransfer = useTranslations("budget.transfer");
  const [transferOpen, setTransferOpen] = useState(false);
  const toast = useToast();

  // ── Query state: every change applies immediately (no draft step) ────────
  const { data: budget, isError: budgetError } = useBudgetQuery(budgetId || null);
  const periodStartDay = budgetId ? budget?.periodStartDay : undefined;
  // Wait for the budget so "this period" is computed from its own start day, not guessed.
  const ready = !budgetId || Boolean(budget) || budgetError;
  const qctx = useMemo<QueryContext>(() => ({ periodStartDay }), [periodStartDay]);
  const parse = useCallback((sp: URLSearchParams) => parseUrlParams(sp, qctx), [qctx]);
  const serialize = useCallback(
    (v: TransactionDraft, sp: URLSearchParams) => serializeToUrl(v, sp, qctx),
    [qctx],
  );
  const defaults = useCallback(() => defaultDraft(qctx), [qctx]);
  const { query: applied, update, replace, reset } = useListQuery<TransactionDraft>({
    defaults,
    parse,
    serialize,
    persistInUrl: persistFiltersInUrl,
  });

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
      amountMin: applied.amountMin,
      amountMax: applied.amountMax,
      sortBy: applied.sortBy,
      sortDir: applied.sortDir,
      page: applied.page,
      pageSize: applied.pageSize,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applied, budgetId, budgetIds],
  );

  const validation = useMemo(() => validateDraft(applied), [applied]);
  const { data, isLoading, isError, refetch, isFetching } = useTransactionsQuery(queryParams, {
    enabled: ready && validation.ok,
  });

  const categories = useCategoriesForBudgets(budgetId ? [budgetId] : (budgetIds ?? []));
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
  function handleSort(key: TransactionDraft["sortBy"]) {
    const dir = applied.sortBy === key && applied.sortDir === "desc" ? "asc" : "desc";
    update({ sortBy: key, sortDir: dir });
  }

  function handleClearFilters() {
    // Clear the filters but stay on the date range the user chose.
    update({
      q: "",
      type: "all",
      categoryIds: [],
      memberIds: [],
      amountMin: undefined,
      amountMax: undefined,
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

  const meId = profile?.id;
  const peopleLabels = {
    trigger: t("people.trigger"),
    title: t("people.title"),
    clear: t("clearFilter"),
    selected: t("selected"),
    empty: t("people.empty"),
    emptyHint: t("people.emptyHint"),
    onlyMe: t("people.onlyMe"),
  };
  const amountLabels = {
    trigger: t("amount.trigger"),
    title: t("amount.title"),
    min: t("amount.min"),
    max: t("amount.max"),
    clear: t("clearFilter"),
    apply: t("amount.apply"),
    order: t("amount.order"),
  };
  const typeOptions = [
    { value: "all" as const, label: t("allTypes") },
    { value: "expense" as const, label: t("expense") },
    { value: "income" as const, label: t("income") },
    ...(isFeatureEnabled("transfers") ? [{ value: "transfer" as const, label: t("transfer") }] : []),
  ];

  const filterControls = (inline: boolean) => (
    <>
      <TypePopover<"all" | "expense" | "income" | "transfer">
        value={applied.type}
        options={typeOptions}
        onChange={(v) => update({ type: v })}
        labels={{ title: t("filterTypeTitle"), all: t("allTypes") }}
      />
      {members.length > 0 && (
        <MemberPopover
          value={applied.memberIds}
          onChange={(ids) => update({ memberIds: ids })}
          members={members}
          labels={peopleLabels}
          meId={meId}
        />
      )}
      <CategoryPopover
        value={applied.categoryIds}
        onChange={(ids) => update({ categoryIds: ids })}
        categories={categories}
      />
      <AmountFilter
        min={applied.amountMin}
        max={applied.amountMax}
        onChange={(lo, hi) => update({ amountMin: lo, amountMax: hi })}
        labels={amountLabels}
        inline={inline}
      />
    </>
  );

  const rangeValue = { range: applied.range, from: applied.dateFrom, to: applied.dateTo };
  const rangeError = validation.errors.dateTo;
  const defaultView = isDefaultView(applied, qctx);
  const resetAll = () => replace(defaults());
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}

      {/* Row 1: search (applies as you type) + actions */}
      <div className="flex items-center gap-2">
        <SearchBox
          className="flex-1"
          value={applied.q}
          onCommit={(q) => update({ q })}
          placeholder={t("searchPlaceholder")}
          clearLabel={t("clearFilter")}
        />
        {budgetId && !readOnly && (
          <Feature flag="transfers">
            <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)} data-testid="open-transfer">
              <ArrowLeftRight className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{tTransfer("button")}</span>
            </Button>
          </Feature>
        )}
        {budgetId && !readOnly && (
          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="add-transaction">
            <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{t("addTransaction")}</span>
          </Button>
        )}
      </div>

      {/* Row 2: the date range is always visible; the other filters sit beside it (a sheet on phones) */}
      <div className="flex flex-wrap items-center gap-2" data-testid="filter-bar">
        <DateRangePicker
          value={rangeValue}
          periodStartDay={periodStartDay}
          onChange={(v) => update({ range: v.range, dateFrom: v.from, dateTo: v.to })}
        />
        <div className="hidden flex-wrap items-center gap-2 sm:flex">{filterControls(false)}</div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 sm:hidden"
          onClick={() => setSheetOpen(true)}
          data-testid="open-filter-sheet"
        >
          {t("filters")}
          {activeFilterCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={t("refresh")}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          <span className="ml-1.5 hidden sm:inline">{t("refresh")}</span>
        </Button>
      </div>

      {rangeError && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5" />
          {t(`range.errors.${rangeError}`)}
        </p>
      )}

      {/* Applied filters — always visible, so a hidden filter can never explain "missing" rows */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="applied-filters">
          {applied.type !== "all" && (
            <FilterBadge label={t(applied.type)} onClear={() => update({ type: "all" })} />
          )}
          {applied.categoryIds.map((id) => (
            <FilterBadge
              key={id}
              label={categoryMap.get(id)?.name ?? id}
              onClear={() => update({ categoryIds: applied.categoryIds.filter((c) => c !== id) })}
            />
          ))}
          {applied.memberIds.map((id) => (
            <FilterBadge
              key={id}
              label={memberMap.get(id)?.displayName ?? id}
              onClear={() => update({ memberIds: applied.memberIds.filter((m) => m !== id) })}
            />
          ))}
          {(applied.amountMin != null || applied.amountMax != null) && (
            <FilterBadge
              label={`${applied.amountMin != null ? fmt(applied.amountMin, currency) : "…"} – ${
                applied.amountMax != null ? fmt(applied.amountMax, currency) : "…"
              }`}
              onClear={() => update({ amountMin: undefined, amountMax: undefined })}
            />
          )}
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("clearFilters")}
          </button>
        </div>
      )}

      {/* Mobile: filters and sorting in one sheet; changes apply as you make them */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="max-w-sm">
          <SheetHeader>
            <SheetTitle>{t("filters")}</SheetTitle>
            <SheetClose onClose={() => setSheetOpen(false)} />
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center gap-2">{filterControls(true)}</div>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {t("sort.label")}
              <select
                value={`${applied.sortBy}:${applied.sortDir}`}
                onChange={(e) => {
                  const [sortBy, sortDir] = e.target.value.split(":") as [
                    TransactionDraft["sortBy"],
                    TransactionDraft["sortDir"],
                  ];
                  update({ sortBy, sortDir });
                }}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                {(["date:desc", "date:asc", "amount:desc", "amount:asc", "description:asc", "description:desc"] as const).map(
                  (v) => (
                    <option key={v} value={v}>
                      {t(`sort.${v.replace(":", "_")}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 p-4">
            <Button variant="outline" className="flex-1" onClick={resetAll} disabled={defaultView}>
              {t("resetAll")}
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              {t("showResults", { count: meta.totalRows })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sticky SummaryStrip — above table */}
      {transactions.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-xl border border-border bg-muted/60 backdrop-blur-sm px-4 py-2.5 text-sm">
          {filteredIncome > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              ↑ {fmt(filteredIncome, currency)}
            </span>
          )}
          {filteredExpense > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              ↓ {fmt(filteredExpense, currency)}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {t("results", { count: meta.totalRows })}
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
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            {t("refresh")}
          </Button>
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activeFilterCount > 0 && (
              <Button size="sm" variant="outline" onClick={handleClearFilters}>
                {t("empty.clear")}
              </Button>
            )}
            {applied.range !== "all" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => replace(draftForRange({ ...applied, page: 1 }, "all", qctx))}
              >
                {t("empty.allTime")}
              </Button>
            )}
          </div>
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
                      aria-label="Select all"
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
                        aria-label="Select row"
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
                        label={isTransferKind(tx.type) ? (tx.type === "transfer_in" ? "Transfer in" : "Transfer out") : tx.type === "income" ? t("income") : t("expense")}
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
                        amountToneClass(tx.type),
                      )}
                    >
                      {amountSign(tx.type)}
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
                    iconToneClass(tx.type),
                  )}
                >
                  {isInflow(tx.type) ? (
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
                    amountToneClass(tx.type),
                  )}
                >
                  {amountSign(tx.type)}
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
              onPage={(p) => update({ page: p })}
              onPageSize={(sz) => update({ pageSize: sz })}
              pageSizeOptions={PAGE_SIZES}
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
        readOnly={readOnly}
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
      <Feature flag="transfers">
        <TransferDialog
          open={transferOpen}
          sourceBudgetId={budgetId}
          onClose={() => setTransferOpen(false)}
        />
      </Feature>
    </div>
  );
}
