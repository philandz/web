"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Receipt, Search, SlidersHorizontal, X } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryPopover,
  FilterBadge,
  MemberPopover,
  Pagination,
  TypePopover,
  type PeopleLabels,
} from "@/components/philand/data-table";
import { DateRangePicker } from "@/components/philand/filters/date-range-picker";
import { SearchBox } from "@/components/philand/filters/search-box";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useExpensesPageQuery, useParticipantsQuery } from "@/modules/sharing/hooks";
import { useParticipantNameLookup } from "@/modules/sharing/participant-name-lookup";
import { useListQuery } from "@/hooks/use-list-query";
import { cn } from "@/lib/utils";
import { validateRange } from "@/lib/date-range";
import type { Expense } from "@/services/sharing-service";

type SharingExpensesListProps = {
  budgetId: string;
  onExpenseClick?: (expense: Expense) => void;
  onAddExpense?: () => void;
  isGuest?: boolean;
  isPrivate?: boolean;
};

type Scope = "all" | "shared" | "personal";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
const SORTS: SortKey[] = ["date_desc", "date_asc", "amount_desc", "amount_asc"];

/** Filter / paging state. Lives in memory: the sharing page owns the URL (tabs, invite links). */
export interface ExpenseListState {
  q: string;
  /** Range token ("all", "month:0", …) or "custom". */
  range: string;
  dateFrom: string;
  dateTo: string;
  paidByIds: string[];
  shareIds: string[];
  categoryIds: string[];
  scope: Scope;
  sort: SortKey;
  page: number;
  pageSize: number;
}

const PAGE_SIZES = [20, 50, 100];

// A shared budget is usually a trip or an event, so it starts on everything; the picker still
// offers the usual presets.
const defaultState = (): ExpenseListState => ({
  q: "",
  range: "all",
  dateFrom: "",
  dateTo: "",
  paidByIds: [],
  shareIds: [],
  categoryIds: [],
  scope: "all",
  sort: "date_desc",
  page: 1,
  pageSize: 50,
});

export function countActiveExpenseFilters(s: ExpenseListState): number {
  return (
    (s.q.trim() ? 1 : 0) +
    (s.scope !== "all" ? 1 : 0) +
    s.paidByIds.length +
    s.shareIds.length +
    s.categoryIds.length
  );
}

// Subtle category stripes — defaults to accent so the row reads as
// "sharing" rather than red/orange/violet per type.
const CATEGORY_STRIPE: Record<string, string> = {
  default: "border-l-amber-400",
};

function formatDateHeader(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return t("time.today");
  if (dateOnly.getTime() === yesterday.getTime()) return t("time.yesterday");
  if (dateOnly >= weekAgo) return t("time.thisWeek");
  return t("time.older");
}

/** "Nov 5" / "5 thg 11": a bucket label like "This week" alone does not say which day a row is. */
function shortDate(ymd: string, locale: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** A sharing expense is one where at least one leg belongs to
 *  someone other than the payer. Personal = the legs are only the
 *  payer (or there are no legs at all — defensive). */
function isSharedExpense(expense: Expense): boolean {
  const legs = expense.legs ?? [];
  if (legs.length === 0) return false;
  return legs.some((l) => l.userId && l.userId !== expense.paidBy);
}

function buildLegSummary(expense: Expense, max = 3): string {
  const legs = expense.legs ?? [];
  if (legs.length === 0) return "";
  const total = expense.totalAmount || legs.reduce((s, l) => s + (l.amount || 0), 0);
  const shown = legs.slice(0, max);
  const rest = legs.length - shown.length;
  const parts = shown.map((l) => {
    const pct = total > 0 ? Math.round((l.amount / total) * 100) : 0;
    return `${pct}%`;
  });
  return rest > 0 ? parts.join(" · ") + ` +${rest}` : parts.join(" · ");
}

export function SharingExpensesList({
  budgetId,
  onExpenseClick,
  onAddExpense,
  isGuest = false,
  isPrivate = false,
}: SharingExpensesListProps) {
  const t = useTranslations("sharing");
  const tl = useTranslations("sharing.list");
  const locale = useLocale();

  const parse = useCallback(() => defaultState(), []);
  const serialize = useCallback(() => {}, []);
  const { query, update, replace, reset } = useListQuery<ExpenseListState>({
    defaults: defaultState,
    parse,
    serialize,
    persistInUrl: false,
  });

  const rangeError = validateRange(query.dateFrom, query.dateTo);
  const { data, isLoading, isError, refetch, isFetching } = useExpensesPageQuery(
    budgetId,
    {
      q: query.q,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      paidByIds: query.paidByIds,
      shareParticipantIds: query.shareIds,
      categoryIds: query.categoryIds,
      scope: query.scope,
      sortBy: query.sort.startsWith("amount") ? "amount" : "date",
      sortDir: query.sort.endsWith("asc") ? "asc" : "desc",
      page: query.page,
      pageSize: query.pageSize,
    },
    { enabled: !rangeError },
  );
  const expenses = data?.items;
  const meta = data?.meta;

  const { data: participants = [] } = useParticipantsQuery(budgetId);
  const { resolve: resolveName } = useParticipantNameLookup(budgetId);

  // `paidBy` / a leg's `userId` is the participant id, so that is what the pickers return.
  const memberOptions = useMemo(
    () =>
      participants.map((p) => ({
        userId: p.userId ?? p.participantId,
        displayName: p.displayName ?? p.userId ?? p.participantId,
        avatar: null as string | null,
      })),
    [participants],
  );
  // The sharing service has no categories endpoint, so options come from what is on screen.
  const [seenCategories, setSeenCategories] = useState<Map<string, string>>(new Map());
  const categoryOptions = useMemo(() => {
    const map = new Map(seenCategories);
    for (const e of expenses ?? []) {
      if (e.categoryId && !map.has(e.categoryId)) map.set(e.categoryId, e.categoryId.slice(0, 8));
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [expenses, seenCategories]);
  // remember options across filter changes so a selected category never disappears from the list
  const rememberCategories = useCallback((ids: string[]) => {
    setSeenCategories((prev) => {
      const next = new Map(prev);
      for (const id of ids) if (!next.has(id)) next.set(id, id.slice(0, 8));
      return next;
    });
  }, []);

  const peopleLabels = (key: "paidBy" | "hasShare"): PeopleLabels => ({
    trigger: tl(`${key}.trigger`),
    title: tl(`${key}.title`),
    clear: t("filterClear"),
    selected: "✓",
    empty: tl(`${key}.empty`),
    emptyHint: tl(`${key}.emptyHint`),
    ...(key === "paidBy" ? { onlyMe: tl("paidBy.onlyMe") } : {}),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { header: string; key: string; items: Expense[] }>();
    for (const expense of expenses ?? []) {
      const key = getDateKey(expense.expenseDate);
      const header = formatDateHeader(expense.expenseDate, t);
      const groupKey = `${header}|${key}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, { header, key: groupKey, items: [] });
      }
      map.get(groupKey)!.items.push(expense);
    }
    return Array.from(map.values());
  }, [expenses, t]);

  const activeFilterCount = countActiveExpenseFilters(query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rangeValue = { range: query.range, from: query.dateFrom, to: query.dateTo };
  const allTime = query.range === "all" && !query.dateFrom && !query.dateTo;

  function clearFilters() {
    update({ q: "", paidByIds: [], shareIds: [], categoryIds: [], scope: "all" });
  }

  const sortSelect = (
    <select
      aria-label={tl("sort.label")}
      value={query.sort}
      onChange={(e) => update({ sort: e.target.value as SortKey })}
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
    >
      {SORTS.map((v) => (
        <option key={v} value={v}>
          {tl(`sort.${v}`)}
        </option>
      ))}
    </select>
  );

  const filterControls = (
    <>
      <MemberPopover
        value={query.paidByIds}
        onChange={(ids) => update({ paidByIds: ids })}
        members={memberOptions}
        labels={peopleLabels("paidBy")}
      />
      <MemberPopover
        value={query.shareIds}
        onChange={(ids) => update({ shareIds: ids })}
        members={memberOptions}
        labels={peopleLabels("hasShare")}
      />
      <CategoryPopover
        value={query.categoryIds}
        onChange={(ids) => {
          rememberCategories(ids);
          update({ categoryIds: ids });
        }}
        categories={categoryOptions}
      />
      <TypePopover<Scope>
        value={query.scope}
        options={[
          { value: "all" as const, label: t("filterAll") },
          { value: "shared" as const, label: t("filterShared") },
          { value: "personal" as const, label: t("filterPersonal") },
        ]}
        onChange={(v) => update({ scope: v })}
        labels={{ title: t("filterScope"), all: t("filterAll") }}
      />
    </>
  );

  if (isLoading && !data) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Nothing at all in this budget (all time, no filter): show the "add the first one" state.
  if (data && meta?.totalRows === 0 && activeFilterCount === 0 && allTime) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title={t("expense.addFirst") ?? "No expenses yet"}
          description={t("budget.emptyExpenses")}
          actionLabel={t("header.addExpense")}
          onAction={onAddExpense}
        />
      </section>
    );
  }

  const chips = (
    <>
      {query.scope !== "all" && (
        <FilterBadge
          label={query.scope === "shared" ? t("filterShared") : t("filterPersonal")}
          onClear={() => update({ scope: "all" })}
        />
      )}
      {query.paidByIds.map((id) => (
        <FilterBadge
          key={`p-${id}`}
          label={`${tl("paidBy.trigger")}: ${resolveName(id)}`}
          onClear={() => update({ paidByIds: query.paidByIds.filter((v) => v !== id) })}
        />
      ))}
      {query.shareIds.map((id) => (
        <FilterBadge
          key={`s-${id}`}
          label={`${tl("hasShare.trigger")}: ${resolveName(id)}`}
          onClear={() => update({ shareIds: query.shareIds.filter((v) => v !== id) })}
        />
      ))}
      {query.categoryIds.map((id) => (
        <FilterBadge
          key={`c-${id}`}
          label={categoryOptions.find((c) => c.id === id)?.name ?? id}
          onClear={() => update({ categoryIds: query.categoryIds.filter((v) => v !== id) })}
        />
      ))}
    </>
  );

  return (
    <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
      <div className="mb-3 space-y-2.5">
        <SearchBox
          value={query.q}
          onCommit={(q) => update({ q })}
          placeholder={t("budget.searchPlaceholder")}
          clearLabel={t("filterClear")}
        />

        <div className="flex flex-wrap items-center gap-2" data-testid="filter-bar">
          <DateRangePicker
            value={rangeValue}
            onChange={(v) => update({ range: v.range, dateFrom: v.from, dateTo: v.to })}
          />
          <div className="hidden flex-wrap items-center gap-2 sm:flex">{filterControls}</div>
          <Button
            size="sm"
            variant="outline"
            className="sm:hidden"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            {tl("filters")}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          <div className="ml-auto hidden sm:block">{sortSelect}</div>
        </div>

        {(activeFilterCount > 0 || rangeError) && (
          <div className="flex flex-wrap items-center gap-2">
            {chips}
            {activeFilterCount > 0 && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                {tl("resetAll")}
              </Button>
            )}
            {rangeError && (
              <span role="alert" className="text-xs text-destructive">
                {t("filterDateRange")}: {rangeError}
              </span>
            )}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="max-w-sm">
          <SheetHeader>
            <SheetTitle>{tl("filters")}</SheetTitle>
            <SheetClose onClose={() => setSheetOpen(false)} />
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center gap-2">{filterControls}</div>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {tl("sort.label")}
              {sortSelect}
            </label>
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 p-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => reset()}
              disabled={activeFilterCount === 0 && allTime && query.sort === "date_desc"}
            >
              {tl("resetAll")}
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              {tl("showResults", { count: meta?.totalRows ?? 0 })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Result bar: count and total cover every match, not only this page */}
      {meta && meta.totalRows > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
          <span>{tl("results", { count: meta.totalRows })}</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            {tl("total")}
            <MoneyAmount
              value={meta.totalAmount}
              currency="VND"
              size="sm"
              masked={isGuest && isPrivate}
            />
          </span>
        </div>
      )}

      {isError ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={tl("loadError")}
          actionLabel={tl("retry")}
          onAction={() => refetch()}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("budget.noMatches")}
          description={
            query.q.trim()
              ? t("budget.noMatchesDesc", { query: query.q })
              : tl("noMatchesFilters")
          }
          actionLabel={allTime ? undefined : tl("emptyAllTime")}
          onAction={
            allTime
              ? undefined
              : () => replace({ ...query, range: "all", dateFrom: "", dateTo: "", page: 1 })
          }
        />
      ) : (
        <div className={cn("space-y-5", isFetching && "opacity-70 transition-opacity")}>
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.header} · {shortDate(group.key.split("|")[1], locale)}
              </p>
              <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                {group.items.map((expense) => {
                  const legSummary = buildLegSummary(expense);
                  const stripeClass = CATEGORY_STRIPE.default;
                  const shared = isSharedExpense(expense);
                  return (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() => onExpenseClick?.(expense)}
                      className={cn(
                        "group flex w-full items-center gap-3 border-l-[3px] p-3 text-left transition-colors",
                        "hover:bg-muted/40 active:scale-[0.998]",
                        stripeClass,
                      )}
                    >
                      <UserAvatar name={resolveName(expense.paidBy)} size={36} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {expense.description}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 px-1.5 py-0 text-[10px] font-normal",
                              shared
                                ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
                                : "border-border/60 text-muted-foreground",
                            )}
                            title={shared ? t("expense.shared") : t("expense.personal")}
                          >
                            {shared ? t("expense.shared") : t("expense.personal")}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {resolveName(expense.paidBy)}
                          </span>
                          {legSummary && (
                            <>
                              <span className="text-xs text-muted-foreground/50">·</span>
                              <Badge
                                variant="outline"
                                className="border-border/60 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                              >
                                {legSummary}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <MoneyAmount
                        value={expense.totalAmount}
                        currency="VND"
                        size="sm"
                        masked={isGuest && isPrivate}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={query.page}
            totalPages={meta.totalPages}
            totalRows={meta.totalRows}
            pageSize={query.pageSize}
            onPage={(p) => update({ page: p })}
            onPageSize={(sz) => update({ pageSize: sz })}
            pageSizeOptions={PAGE_SIZES}
          />
        </div>
      )}
    </section>
  );
}
