"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useBulkTransactionMutation, useTransactionsQuery } from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { Transaction, TransactionListParams, TransactionType } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

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
}

export function TransactionsTab({
  budgetId,
  budgetIds,
  currency = "VND",
  showBudgetFilter = false,
}: TransactionsTabProps) {
  const t = useTranslations("budget.transactions");
  const toast = useToast();

  const [params, setParams] = useState<TransactionListParams>({
    budgetId: budgetId || undefined,
    budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
    page: 1,
    pageSize: 20,
  });

  // Sync budgetId prop changes (e.g. user switches budget on global page)
  useEffect(() => {
    setParams((p) => ({
      ...p,
      budgetId: budgetId || undefined,
      budgetIds: !budgetId && budgetIds?.length ? budgetIds : undefined,
      page: 1,
    }));
    setSelected(new Set());
  }, [budgetId, budgetIds]);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading, isError } = useTransactionsQuery(params);
  const { data: categories = [] } = useCategoriesQuery(budgetId || null);
  const { data: members = [] } = useBudgetMembersQuery(budgetId || null);
  const profile = useAuthStore((s) => s.profile);
  const bulkMutation = useBulkTransactionMutation();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members],
  );

  const transactions = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 20, totalPages: 1, totalRows: 0 };

  function update(patch: Partial<TransactionListParams>) {
    setParams((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
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

          {/* Add Transaction button */}
          {budgetId && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
              <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("addTransaction")}</span>
            </Button>
          )}

          {/* Quick Add button */}
          {budgetId && (
            <Button size="sm" variant="outline" onClick={() => setQuickAddOpen(true)} className="shrink-0">
              <TableProperties className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("quickAdd")}</span>
            </Button>
          )}
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
        <div className="flex flex-wrap gap-1.5">
          {params.type && <FilterBadge label={params.type} onClear={() => update({ type: undefined })} />}
          {params.categoryId && (
            <FilterBadge
              label={categories.find((c) => c.id === params.categoryId)?.name ?? params.categoryId}
              onClear={() => update({ categoryId: undefined })}
            />
          )}
          {params.dateFrom && <FilterBadge label={`From ${params.dateFrom}`} onClear={() => update({ dateFrom: undefined })} />}
          {params.dateTo && <FilterBadge label={`To ${params.dateTo}`} onClear={() => update({ dateTo: undefined })} />}
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {categoryMap.get(tx.categoryId ?? "") ?? "—"}
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
                        {categoryMap.get(tx.categoryId ?? "")
                          ? ` · ${categoryMap.get(tx.categoryId ?? "")}`
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
