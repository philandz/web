"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Shell } from "./shell";
import { SharingSettlementCard } from "./sharing-settlement-card";
import { SharingExpensesList } from "./sharing-expenses-list";
import { SharingMembersCard } from "./sharing-members-card";
import { ActivityLogList } from "./activity-log-list";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import { AddSharedExpenseDrawer } from "./add-shared-expense-drawer";
import { MoneyAmount } from "@/components/ui/money-amount";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Button } from "@/components/ui/button";
import { useExpensesQuery, useParticipantsQuery } from "@/modules/sharing/hooks";
import { StaggeredMount } from "./staggered-mount";
import type { Expense } from "@/services/sharing-service";
import { useToast } from "@/components/state/toast-provider";

type SharingBudgetViewProps = {
  budgetId: string;
  budgetName?: string;
};

export function SharingBudgetView({
  budgetId,
  budgetName = "Sharing Budget",
}: SharingBudgetViewProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const toast = useToast();

  const { data: expenses } = useExpensesQuery(budgetId);
  const { data: participants } = useParticipantsQuery(budgetId);

  const totalSpent = expenses?.reduce((sum, e) => sum + e.totalAmount, 0) ?? 0;

  function handleExpenseClick(expense: Expense) {
    setSelectedExpense(expense);
    setShowExpenseDetail(true);
  }

  function handleAddExpense() {
    setShowAddExpense(true);
  }

  // Build participant users for AvatarStack
  const participantUsers = (participants ?? []).map((p) => ({
    id: p.participantId,
    displayName: p.displayName,
    avatar: null, // Would come from participant data if available
  }));

  return (
    <>
      <Shell
        budgetId={budgetId}
        budgetName={budgetName}
        totalSpent={totalSpent}
        currency="VND"
        participants={participantUsers}
        rightRail={
          <div className="space-y-6">
            <SharingMembersCard budgetId={budgetId} />
            <ActivityLogList budgetId={budgetId} />
          </div>
        }
      >
        <StaggeredMount defaultDelayMs={0} staggerMs={40}>
          <div className="space-y-6 max-w-2xl">
            {/* Header strip - visible on mobile inside Shell */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">{budgetName}</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#0d9488]/10 text-[#0d9488] text-sm font-medium">
                  VND
                </span>
                {participantUsers.length > 0 && (
                  <AvatarStack users={participantUsers} max={5} size="md" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <MoneyAmount value={totalSpent} size="xl" />
                <Button onClick={handleAddExpense}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add expense
                </Button>
              </div>
            </div>

            {/* Settlement card */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <SharingSettlementCard budgetId={budgetId} />
            </section>

            {/* Expenses list */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <SharingExpensesList
                budgetId={budgetId}
                onExpenseClick={handleExpenseClick}
                onAddExpense={handleAddExpense}
              />
            </section>

            {/* Activity log (mobile-friendly inline version) */}
            <section className="rounded-2xl border border-border bg-card p-5 lg:hidden">
              <ActivityLogList budgetId={budgetId} />
            </section>
          </div>
        </StaggeredMount>
      </Shell>

      {/* Expense detail sheet */}
      <ExpenseDetailSheet
        expense={selectedExpense}
        open={showExpenseDetail}
        onOpenChange={(open) => {
          setShowExpenseDetail(open);
          if (!open) setSelectedExpense(null);
        }}
        onDelete={(expenseId) => {
          toast.success("Expense deleted");
          setSelectedExpense(null);
        }}
      />

      {/* Add expense drawer */}
      <AddSharedExpenseDrawer
        budgetId={budgetId}
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
      />
    </>
  );
}