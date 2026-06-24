"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useExpensesQuery, useParticipantsQuery, useSettlementQuery, useDeleteExpenseMutation } from "@/modules/sharing/hooks";
import { useToast } from "@/components/state/toast-provider";
import type { Expense } from "@/services/sharing-service";

import { SharingPageHeader } from "./sharing-page-header";
import { SharingMobileTabs, type MobileTab } from "./sharing-mobile-tabs";
import { SharingBottomBar } from "./sharing-bottom-bar";
import { SharingMembersCard } from "./sharing-members-card";
import { SharingExpensesList } from "./sharing-expenses-list";
import { SharingSettlementCard } from "./sharing-settlement-card";
import { ActivityLogList } from "./activity-log-list";
import { AddSharedExpenseDrawer } from "./add-shared-expense-drawer";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import { InviteMemberDialog } from "./invite-member-dialog";

type SharingBudgetViewProps = {
  budgetId: string;
  budgetName?: string;
};

export function SharingBudgetView({
  budgetId,
  budgetName = "Sharing Budget",
}: SharingBudgetViewProps) {
  const t = useTranslations("sharing");
  const toast = useToast();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("members");

  const { data: expenses } = useExpensesQuery(budgetId);
  const { data: participants } = useParticipantsQuery(budgetId);
  const { data: settlement } = useSettlementQuery(budgetId);
  const deleteExpense = useDeleteExpenseMutation();

  const totalSpent = useMemo(
    () => expenses?.reduce((sum, e) => sum + e.totalAmount, 0) ?? 0,
    [expenses],
  );

  const hasUnsettled = (settlement?.transfers ?? []).length > 0;

  const refs = {
    members: useRef<HTMLDivElement>(null),
    expenses: useRef<HTMLDivElement>(null),
    settle: useRef<HTMLDivElement>(null),
    activity: useRef<HTMLDivElement>(null),
  };

  function handleMobileTabChange(tab: MobileTab) {
    setMobileTab(tab);
    refs[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleExpenseClick(expense: Expense) {
    setSelectedExpense(expense);
    setShowExpenseDetail(true);
  }

  function handleAddExpense() {
    setShowAddExpense(true);
  }

  function handleMarkSettled() {
    refs.settle.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileTab("settle");
  }

  return (
    <div className="animate-fade-in-up min-h-screen bg-background">
      <SharingPageHeader
        budgetId={budgetId}
        budgetName={budgetName}
        currency="VND"
        totalSpent={totalSpent}
        participants={(participants ?? []).map((p) => ({
          participantId: p.participantId,
          displayName: p.displayName,
          kind: p.kind,
        }))}
        onInviteClick={() => setInviteOpen(true)}
        onAddExpenseClick={handleAddExpense}
      />

      <SharingMobileTabs active={mobileTab} onChange={handleMobileTabChange} />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 lg:pb-10">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-4">
            <div ref={refs.settle}>
              <SharingSettlementCard budgetId={budgetId} />
            </div>
            <div ref={refs.expenses}>
              <SharingExpensesList
                budgetId={budgetId}
                onExpenseClick={handleExpenseClick}
                onAddExpense={handleAddExpense}
              />
            </div>
            <div ref={refs.activity} className="lg:hidden">
              <ActivityLogList budgetId={budgetId} />
            </div>
          </div>

          {/* Right rail (desktop) */}
          <aside className="hidden lg:block space-y-4">
            <div ref={refs.members}>
              <SharingMembersCard budgetId={budgetId} budgetName={budgetName} />
            </div>
            <div ref={refs.activity}>
              <ActivityLogList budgetId={budgetId} />
            </div>
          </aside>

          {/* Mobile-only Members card at the bottom (after expenses) */}
          <div ref={refs.members} className="lg:hidden">
            <SharingMembersCard budgetId={budgetId} budgetName={budgetName} />
          </div>
        </div>
      </main>

      <SharingBottomBar
        onInvite={() => setInviteOpen(true)}
        onAddExpense={handleAddExpense}
        onMarkSettled={handleMarkSettled}
        hasUnsettled={hasUnsettled}
      />

      <InviteMemberDialog
        budgetId={budgetId}
        budgetName={budgetName}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <ExpenseDetailSheet
        expense={selectedExpense}
        open={showExpenseDetail}
        onOpenChange={(open) => {
          setShowExpenseDetail(open);
          if (!open) setSelectedExpense(null);
        }}
        onDelete={(expenseId) => {
          deleteExpense.mutate(expenseId, {
            onSuccess: () => {
              toast.success(t("expense.deleteExpenseSuccess"));
              setSelectedExpense(null);
            },
            onError: () => toast.error(t("expense.deleteExpenseError")),
          });
        }}
      />

      <AddSharedExpenseDrawer
        budgetId={budgetId}
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
      />
    </div>
  );
}