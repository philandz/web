"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Receipt, Search } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpensesQuery } from "@/modules/sharing/hooks";
import { useParticipantNameLookup } from "@/modules/sharing/participant-name-lookup";
import { cn } from "@/lib/utils";
import type { Expense } from "@/services/sharing-service";

type SharingExpensesListProps = {
  budgetId: string;
  onExpenseClick?: (expense: Expense) => void;
  onAddExpense?: () => void;
};

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
}: SharingExpensesListProps) {
  const t = useTranslations("sharing");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: expenses, isLoading } = useExpensesQuery(budgetId);
  const { resolve: resolveName } = useParticipantNameLookup(budgetId);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.paidBy.toLowerCase().includes(q) ||
        resolveName(e.paidBy).toLowerCase().includes(q),
    );
  }, [expenses, searchQuery, resolveName]);

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
      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("budget.searchPlaceholder")}
          className="w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
        />
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
                        <p className="truncate text-sm font-medium text-foreground">
                          {expense.description}
                        </p>
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