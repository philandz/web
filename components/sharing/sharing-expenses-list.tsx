"use client";

import { useState, useMemo } from "react";
import { Receipt, Plus, Search } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useExpensesQuery } from "@/modules/sharing/hooks";
import { cn } from "@/lib/utils";
import type { Expense } from "@/services/sharing-service";

type SharingExpensesListProps = {
  budgetId: string;
  onExpenseClick?: (expense: Expense) => void;
  onAddExpense?: () => void;
};

type CategoryFilter = "all" | "food" | "transport" | "lodging" | "activities" | "other";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "lodging", label: "Lodging" },
  { value: "activities", label: "Activities" },
  { value: "other", label: "Other" },
];

// Category color mapping (hex colors for left border)
const CATEGORY_COLORS: Record<string, string> = {
  food: "#f97316",
  transport: "#3b82f6",
  lodging: "#8b5cf6",
  activities: "#ec4899",
  default: "#0d9488",
};

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return "Today";
  if (dateOnly.getTime() === yesterday.getTime()) return "Yesterday";
  if (dateOnly >= weekAgo) return "This week";
  return "Older";
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SharingExpensesList({
  budgetId,
  onExpenseClick,
  onAddExpense,
}: SharingExpensesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const { data: expenses, isLoading } = useExpensesQuery(budgetId);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    let filtered = expenses;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== "all") {
      // In a real implementation, category would be mapped from categoryId
      // For now, we just show all
      filtered = filtered;
    }

    return filtered;
  }, [expenses, searchQuery, categoryFilter]);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};

    for (const expense of filteredExpenses) {
      const key = getDateKey(expense.expenseDate);
      const header = formatDateHeader(expense.expenseDate);
      const groupKey = `${header}|${key}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(expense);
    }

    return Object.entries(groups).map(([key, items]) => {
      const [header] = key.split("|");
      return { header, items };
    });
  }, [filteredExpenses]);

  function getCategoryColor(expense: Expense): string {
    // In a real implementation, look up category by expense.categoryId
    return CATEGORY_COLORS.default;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted animate-pulse rounded-xl" />
            <div className="h-16 bg-muted animate-pulse rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-6 w-6" />}
        title="No expenses yet"
        description="Add your first expense to start tracking"
        actionLabel="Add expense"
        onAction={onAddExpense}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setCategoryFilter(filter.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                categoryFilter === filter.value
                  ? "bg-[#0d9488] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped expense list */}
      {groupedExpenses.map((group) => (
        <div key={group.header} className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{group.header}</p>
          <div className="space-y-2">
            {group.items.map((expense) => (
              <button
                key={expense.id}
                onClick={() => onExpenseClick?.(expense)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: getCategoryColor(expense),
                }}
              >
                <UserAvatar name={expense.paidBy} size={36} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">{expense.paidBy}</p>
                </div>
                <MoneyAmount value={expense.totalAmount} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}