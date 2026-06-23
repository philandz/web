"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { AddSharedExpenseDrawer } from "./add-shared-expense-drawer";

type ShellProps = {
  budgetId: string;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  totalSpent?: number;
  budgetName?: string;
  currency?: string;
  participants?: Array<{ id: string; displayName: string; avatar?: string | null }>;
};

export function Shell({
  budgetId,
  children,
  rightRail,
  totalSpent,
  budgetName,
  currency = "VND",
  participants = [],
}: ShellProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sticky header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">
              {budgetName ?? "Budget"}
            </h1>
            {typeof totalSpent === "number" && (
              <p className="text-sm text-muted-foreground tabular-nums">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 0,
                }).format(totalSpent)}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">{budgetName ?? "Budget"}</h1>
              <span className="px-2 py-0.5 rounded-full bg-[#0d9488]/10 text-[#0d9488] text-sm font-medium">
                {currency}
              </span>
            </div>
            {typeof totalSpent === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total spent</span>
                <span className="text-lg font-bold tabular-nums">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 0,
                  }).format(totalSpent)}
                </span>
              </div>
            )}
          </div>
        </header>
      </div>

      {/* Main content */}
      <div className="flex">
        {/* Main column */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-6 lg:py-6">
          {children}
        </main>

        {/* Right rail (desktop only) */}
        {rightRail && (
          <aside className="hidden w-80 shrink-0 border-l border-border/60 p-6 lg:block">
            {rightRail}
          </aside>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#0d9488] text-white shadow-lg hover:bg-[#0d9488]/90 transition-colors lg:hidden"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add expense drawer */}
      <AddSharedExpenseDrawer
        budgetId={budgetId}
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
      />
    </div>
  );
}