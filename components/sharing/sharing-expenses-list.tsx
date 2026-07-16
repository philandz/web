"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Receipt, Search } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryPopover,
  DateDropdown,
  FilterBadge,
  FilterPanel,
  MemberPopover,
  TypePopover,
} from "@/components/philand/data-table";
import { useExpensesQuery, useParticipantsQuery } from "@/modules/sharing/hooks";
import { useParticipantNameLookup } from "@/modules/sharing/participant-name-lookup";
import { cn } from "@/lib/utils";
import type { Expense } from "@/services/sharing-service";

type SharingExpensesListProps = {
  budgetId: string;
  onExpenseClick?: (expense: Expense) => void;
  onAddExpense?: () => void;
};

type Scope = "all" | "shared" | "personal";

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
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

function inDateRange(expenseDate: string, range: DateRange | null): boolean {
  if (!range) return true;
  if (!range.from && !range.to) return true;
  // expenseDate is YYYY-MM-DD; compare lexicographically
  if (range.from && expenseDate < range.from) return false;
  if (range.to && expenseDate > range.to) return false;
  return true;
}

export function SharingExpensesList({
  budgetId,
  onExpenseClick,
  onAddExpense,
}: SharingExpensesListProps) {
  const t = useTranslations("sharing");
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const { data: expenses, isLoading } = useExpensesQuery(budgetId);
  const { data: participants = [] } = useParticipantsQuery(budgetId);
  const { resolve: resolveName } = useParticipantNameLookup(budgetId);

  // Build the member / category option lists from the participants
  // payload and the loaded expenses. We use the loaded expenses as the
  // category source because the sharing service doesn't expose a
  // /categories endpoint; the id alone is the best we can do until the
  // gateway adds the lookup.
  const memberOptions = useMemo(
    () =>
      participants.map((p) => ({
        // `paidBy` on an expense is the user id. Participants are returned
        // with both `userId` (when known) and `participantId` (always).
        // Prefer userId so the MemberPopover checkbox can be matched
        // against the expense's `paidBy`.
        userId: p.userId ?? p.participantId,
        displayName: p.displayName ?? p.userId ?? p.participantId,
        avatar: null as string | null,
      })),
    [participants],
  );
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of expenses ?? []) {
      if (e.categoryId && !map.has(e.categoryId)) {
        // Sharing service doesn't return category names yet; fall back
        // to a short id so the chip is still readable.
        map.set(e.categoryId, { id: e.categoryId, name: e.categoryId.slice(0, 8) });
      }
    }
    return Array.from(map.values());
  }, [expenses]);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    const q = searchQuery.trim().toLowerCase();
    const hasScope = scope !== "all";
    const hasMember = memberIds.length > 0;
    const hasCategory = categoryIds.length > 0;
    const hasSearch = q.length > 0;
    const hasDate = dateRange.from !== "" || dateRange.to !== "";
    if (!hasScope && !hasMember && !hasCategory && !hasSearch && !hasDate) return expenses;

    return expenses.filter((e) => {
      if (hasScope) {
        if (scope === "shared" && !isSharedExpense(e)) return false;
        if (scope === "personal" && isSharedExpense(e)) return false;
      }
      if (hasMember && !memberIds.includes(e.paidBy)) return false;
      if (hasCategory && (!e.categoryId || !categoryIds.includes(e.categoryId))) {
        return false;
      }
      if (hasSearch) {
        const hay = `${e.description} ${e.paidBy} ${resolveName(e.paidBy)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (hasDate && !inDateRange(e.expenseDate, dateRange)) return false;
      return true;
    });
  }, [expenses, searchQuery, scope, memberIds, categoryIds, dateRange, resolveName]);

  const grouped = useMemo(() => {
    const map = new Map<string, { header: string; key: string; items: Expense[] }>();
    for (const expense of filtered) {
      const key = getDateKey(expense.expenseDate);
      const header = formatDateHeader(expense.expenseDate, t);
      const groupKey = `${header}|${key}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, { header, key: groupKey, items: [] });
      }
      map.get(groupKey)!.items.push(expense);
    }
    return Array.from(map.values());
  }, [filtered]);

  const activeFilterCount =
    (scope !== "all" ? 1 : 0) +
    memberIds.length +
    categoryIds.length +
    (dateRange.from ? 1 : 0) +
    (dateRange.to ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const [filtersOpen, setFiltersOpen] = useState(false);

  function clearFilters() {
    setScope("all");
    setMemberIds([]);
    setCategoryIds([]);
    setDateRange({ from: "", to: "" });
    setSearchQuery("");
  }

  if (isLoading) {
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

  if (!expenses || expenses.length === 0) {
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

  return (
    <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
      {/* Search + filter panel (matches the transactions-tab toolbar). */}
      <div className="mb-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("budget.searchPlaceholder") ?? "Search..."}
              className="w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <FilterPanel
          open={filtersOpen}
          onToggle={() => setFiltersOpen((p) => !p)}
          activeFilterCount={activeFilterCount}
        >
          <MemberPopover
            value={memberIds}
            onChange={setMemberIds}
            members={memberOptions}
          />
          <CategoryPopover
            value={categoryIds}
            onChange={setCategoryIds}
            categories={categoryOptions}
          />
          <TypePopover<Scope>
            value={scope}
            options={[
              { value: "all" as const, label: t("filterAll") ?? "All" },
              { value: "shared" as const, label: t("filterShared") ?? "Shared" },
              { value: "personal" as const, label: t("filterPersonal") ?? "Personal" },
            ]}
            onChange={(v) => setScope(v)}
            labels={{ title: t("filterScope") ?? "Filter by scope", all: t("filterAll") ?? "All" }}
          />
          <DateDropdown
            from={dateRange.from}
            to={dateRange.to}
            onSelect={(preset) => {
              // Reuse the same getPresetRange logic the transactions-tab
              // uses. We don't import the helper directly to keep the
              // sharing module dependency-light.
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const fmt = (d: Date) => d.toISOString().slice(0, 10);
              if (preset === "today") {
                setDateRange({ from: fmt(today), to: fmt(today) });
              } else if (preset === "last7Days") {
                const from = new Date(today);
                from.setDate(from.getDate() - 6);
                setDateRange({ from: fmt(from), to: fmt(today) });
              } else if (preset === "thisMonth") {
                const first = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange({ from: fmt(first), to: fmt(today) });
              } else {
                setDateRange((r) => ({ ...r }));
              }
            }}
            onCustomChange={(from, to) => setDateRange({ from, to })}
          />

          {/* Active filter chips */}
          {scope !== "all" && (
            <FilterBadge
              label={scope}
              onClear={() => setScope("all")}
            />
          )}
          {memberIds.map((id) => (
            <FilterBadge
              key={id}
              label={resolveName(id)}
              onClear={() => setMemberIds((m) => m.filter((v) => v !== id))}
            />
          ))}
          {categoryIds.map((id) => (
            <FilterBadge
              key={id}
              label={categoryOptions.find((c) => c.id === id)?.name ?? id}
              onClear={() => setCategoryIds((c) => c.filter((v) => v !== id))}
            />
          ))}
          {dateRange.from && (
            <FilterBadge
              label={`From ${dateRange.from}`}
              onClear={() => setDateRange((r) => ({ ...r, from: "" }))}
            />
          )}
          {dateRange.to && (
            <FilterBadge
              label={`To ${dateRange.to}`}
              onClear={() => setDateRange((r) => ({ ...r, to: "" }))}
            />
          )}
        </FilterPanel>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("budget.noMatches")}
          description={t("budget.noMatchesDesc", { query: searchQuery })}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.header}
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
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
