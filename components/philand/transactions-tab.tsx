"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, ListFilter, Paperclip, Plus, RefreshCw, ReceiptText, Search, TableProperties, Trash2 } from "lucide-react";
import { DateRangeFilter, EnumFilter, FilterBadge, Pagination, SortButton, StatusChip } from "@/components/philand/data-table";
import { TransactionDetailDrawer } from "@/components/philand/transaction-detail-drawer";
import { TransactionFormDrawer } from "@/components/philand/transaction-form-drawer";
import { QuickAddDrawer } from "@/components/philand/quick-add-drawer";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/state/toast-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBulkTransactionMutation, useTransactionsQuery } from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { Transaction, TransactionListParams, TransactionType } from "@/services/transaction-service";
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

interface TransactionsTabProps {
  budgetId: string;
  budgetIds?: string[];
  currency?: string;
  /** When true, shows a budget filter column (used on global transactions page) */
  showBudgetFilter?: boolean;
  /** When true, keeps filter state in URL search params */
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
  const toast = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const readUrlParams = useCallback(() => {
    // Prefix keeps these scoped (budget detail already uses `tab=...`).
    const q = searchParams.get("tx_q") || undefined;
    const type = (searchParams.get("tx_type") as TransactionType | null) || undefined;
    const categoryId = searchParams.get("tx_category") || undefined;
    const dateFrom = searchParams.get("tx_from") || undefined;
    const dateTo = searchParams.get("tx_to") || undefined;
    const page = Number(searchParams.get("tx_page") || "1") || 1;
    const pageSize = Number(searchParams.get("tx_pageSize") || "20") || 20;
    const sortBy = (searchParams.get("tx_sortBy") as TransactionListParams["sortBy"] | null) || undefined;
    const sortDir = (searchParams.get("tx_sortDir") as TransactionListParams["sortDir"] | null) || undefined;

    return { q, type, categoryId, dateFrom, dateTo, page, pageSize, sortBy, sortDir };
  }, [searchParams]);

  const writeUrlParams = useCallback((next: Partial<TransactionListParams>) => {
    if (!persistFiltersInUrl) return;

    const sp = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string | number | undefined | null) => {
      if (value === undefined || value === null || value === "") sp.delete(key);
      else sp.set(key, String(value));
    };

    // Only touch keys explicitly provided, otherwise keep current URL state.
    if ("q" in next) setOrDelete("tx_q", next.q);
    if ("type" in next) setOrDelete("tx_type", next.type);
    if ("categoryId" in next) setOrDelete("tx_category", next.categoryId);
    if ("dateFrom" in next) setOrDelete("tx_from", next.dateFrom);
    if ("dateTo" in next) setOrDelete("tx_to", next.dateTo);
    if ("page" in next) setOrDelete("tx_page", next.page);
    if ("pageSize" in next) setOrDelete("tx_pageSize", next.pageSize);
    if ("sortBy" in next) setOrDelete("tx_sortBy", next.sortBy);
    if ("sortDir" in next) setOrDelete("tx_sortDir", next.sortDir);

    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [persistFiltersInUrl, pathname, router, searchParams, startTransition]);

  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [params, setParams] = useState<TransactionListParams>({
    budgetId: budgetId || undefined,
    budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
    page: 1,
    pageSize: 20,
  });

  // Initialize from URL (and keep in sync when user uses back/forward).
  useEffect(() => {
    if (!persistFiltersInUrl) return;
    const u = readUrlParams();
    setParams((p) => ({
      ...p,
      ...u,
      budgetId: budgetId || undefined,
      budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
    }));
    setSortKey(u.sortBy ?? "");
    setSortDir(u.sortDir ?? "desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistFiltersInUrl, readUrlParams, searchParams]);

  // Sync budgetId prop changes (e.g. user switches budget on global page)
  useEffect(() => {
    setParams((p) => ({
      ...p,
      budgetId: budgetId || undefined,
      budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
      page: 1,
    }));
    writeUrlParams({ page: 1 });
    setSelected(new Set());
  }, [budgetId, budgetIds, writeUrlParams]);

  const { data, isLoading, isError } = useTransactionsQuery(params);
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
  const meta = data?.meta ?? { page: 1, pageSize: 20, totalPages: 1, totalRows: 0 };

  function update(patch: Partial<TransactionListParams>) {
    setParams((p) => {
      const next = { ...p, ...patch, page: patch.page ?? 1 };
      writeUrlParams(next);
      return next;
    });
    setSelected(new Set());
  }

  function toggleSort(key: string) {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    update({ sortBy: key as TransactionListParams["sortBy"], sortDir: newDir });
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
        onSuccess: () => { toast.success(t("bulkDeleteSuccess")); setSelected(new Set()); },
        onError: () => toast.error(t("bulkDeleteError")),
      },
    );
  }

  const hasFilters = Boolean(params.q || params.type || params.categoryId || params.dateFrom || params.dateTo);

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="space-y-2">
        {/* Row 1: search + filter toggle (mobile) + action buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={params.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
              className="pl-9"
              placeholder={t("searchPlaceholder")}
            />
          </div>

          <Button
            size="sm"
            variant={filtersOpen || hasFilters ? "secondary" : "outline"}
            className="h-10 w-10 shrink-0 p-0 sm:hidden"
            onClick={() => setFiltersOpen((p) => !p)}
            aria-label="Toggle filters"
          >
            <ListFilter className="h-4 w-4" />
          </Button>

          {/* Add transaction — split button */}
          {budgetId ? (
            <DropdownMenu>
              <div className="flex shrink-0 items-stretch">
                {/* Left: direct open form */}
                <Button
                  size="sm"
                  className="rounded-r-none border-r border-r-white/20 pr-3"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("addTransaction")}</span>
                </Button>
                {/* Right: chevron dropdown */}
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
                  <TableProperties className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold">{t("quickAdd")}</div>
                    <div className="text-xs text-muted-foreground">Spreadsheet — paste or CSV</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {/* Row 2: secondary filters — stacked on mobile, inline on desktop */}
        <div className={cn(
          "flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
          filtersOpen ? "flex" : "hidden sm:flex",
        )}>
          {/* Type: pill segmented control */}
          <EnumFilter<TransactionType>
            value={params.type}
            options={[
              { value: "income", label: t("income") },
              { value: "expense", label: t("expense") },
            ]}
            onChange={(v) => update({ type: v })}
            className="w-full sm:w-auto"
          />

          {/* Category: select */}
          <SelectNative
            value={params.categoryId ?? ""}
            onValueChange={(v) => update({ categoryId: v || undefined })}
            className="w-full sm:w-44"
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectNative>

          {/* Date range: compact widget */}
          <DateRangeFilter
            from={params.dateFrom}
            to={params.dateTo}
            onFrom={(v) => update({ dateFrom: v })}
            onTo={(v) => update({ dateTo: v })}
            onClear={() => update({ dateFrom: undefined, dateTo: undefined })}
            className="w-full sm:w-auto sm:min-w-[260px]"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={() => update({ q: undefined, type: undefined, categoryId: undefined, dateFrom: undefined, dateTo: undefined })}
              className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>
      {hasFilters && (
        <div className="space-y-1.5">
          {/* Summary pills */}
          {transactions.length > 0 && (() => {
            const filteredIncome  = transactions.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
            const filteredExpense = transactions.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
            return (
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
            );
          })()}
          {/* Active filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {params.type && <FilterBadge label={params.type} onClear={() => update({ type: undefined })} />}
            {params.categoryId && (
              <FilterBadge
                label={categoryMap.get(params.categoryId)?.name ?? params.categoryId}
                onClear={() => update({ categoryId: undefined })}
              />
            )}
            {params.dateFrom && <FilterBadge label={`From ${params.dateFrom}`} onClear={() => update({ dateFrom: undefined })} />}
            {params.dateTo && <FilterBadge label={`To ${params.dateTo}`} onClear={() => update({ dateTo: undefined })} />}
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selected.size} {t("selected")}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-destructive text-destructive hover:bg-destructive/10"
            disabled={bulkMutation.isPending}
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("bulkDelete")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {t("clearSelection")}
          </Button>
        </div>
      )}

      {/* ── Table / list ── */}
      {isLoading ? (
        <SectionLoadingState rows={5} />
      ) : isError ? (
        <div className="surface-panel flex flex-col items-center gap-2 rounded-2xl px-4 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
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
                    <SortButton label={t("colDate")} active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colType")}
                  </th>
                  <th className="px-4 py-3">
                    <SortButton label={t("colDescription")} active={sortKey === "description"} dir={sortDir} onClick={() => toggleSort("description")} />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colCategory")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton label={t("colAmount")} active={sortKey === "amount"} dir={sortDir} onClick={() => toggleSort("amount")} />
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
                    onClick={() => { setDetailTx(tx); setDetailOpen(true); }}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                    <td className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      tx.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500",
                    )}>
                      {tx.type === "income" ? "+" : "−"}{fmt(tx.amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    {members.length > 0 && (() => {
                      const creator = tx.createdBy ? memberMap.get(tx.createdBy) : undefined;
                      const isMe = tx.createdBy === profile?.id;
                      return (
                        <td className="px-4 py-3">
                          {creator ? (
                            <UserAvatar
                              name={creator.displayName}
                              src={isMe ? (profile?.avatar ?? undefined) : undefined}
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

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={members.length > 0 ? 9 : 8} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <ReceiptText className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">{t("empty")}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-border/40 md:hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <ReceiptText className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  onClick={() => { setDetailTx(tx); setDetailOpen(true); }}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    tx.type === "income"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-500",
                  )}>
                    {tx.type === "income"
                      ? <ArrowUpRight className="h-4 w-4" />
                      : <ArrowDownLeft className="h-4 w-4" />}
                  </div>

                  {/* Description + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground leading-snug">
                      {tx.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {(() => {
                        const creator = tx.createdBy ? memberMap.get(tx.createdBy) : undefined;
                        const isMe = tx.createdBy === profile?.id;
                        return creator ? (
                          <UserAvatar
                            name={creator.displayName}
                            src={isMe ? (profile?.avatar ?? undefined) : undefined}
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

                  {/* Amount */}
                  <p className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    tx.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500",
                  )}>
                    {tx.type === "income" ? "+" : "−"}{fmt(tx.amount, currency)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {transactions.length > 0 && (
            <div className="border-t border-border/40 px-4 pb-3">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                totalRows={meta.totalRows}
                pageSize={meta.pageSize}
                onPage={(p) => update({ page: p })}
                onPageSize={(s) => update({ pageSize: s, page: 1 })}
              />
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      <TransactionDetailDrawer
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailTx(null); }}
        transaction={detailTx}
        budgetId={budgetId}
        currency={currency}
      />

      {/* Create drawer */}
      <TransactionFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        budgetId={budgetId}
      />

      {/* Quick Add drawer */}
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
