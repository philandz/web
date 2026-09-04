"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Receipt, Users, Scale, Settings, Wallet } from "lucide-react";
import { useExpensesQuery, useParticipantsQuery, useSettlementQuery, useDeleteExpenseMutation, sharingKeys } from "@/modules/sharing/hooks";
import { useQuery } from "@tanstack/react-query";
import { budgetService } from "@/services/budget-service";
import { useToast } from "@/components/state/toast-provider";
import { useAuthStore } from "@/lib/auth-store";
import { readSharingSession } from "@/lib/sharing/session";
import type { Expense } from "@/services/sharing-service";
import { cn } from "@/lib/utils";

import { SharingPageHeader } from "./sharing-page-header";
import { SharingBottomBar } from "./sharing-bottom-bar";
import { SharingExpensesList } from "./sharing-expenses-list";
import { SharingSettlementCard } from "./sharing-settlement-card";
import { AddSharedExpenseDrawer } from "./add-shared-expense-drawer";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MembersTab } from "./members-tab";
import { BalancesTab } from "./balances-tab";
import { SettingsTab } from "./settings-tab";
import { GuestViewBanner } from "./guest-view-banner";

type BudgetTab = "overview" | "members" | "balances" | "settle" | "settings";

const BUDGET_TABS: { value: BudgetTab; icon: typeof Receipt; labelKey: string }[] = [
  { value: "overview", icon: Receipt, labelKey: "overview" },
  { value: "members", icon: Users, labelKey: "members" },
  { value: "balances", icon: Scale, labelKey: "balances" },
  { value: "settle", icon: Wallet, labelKey: "settle" },
  { value: "settings", icon: Settings, labelKey: "settings" },
];

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
  const token = useAuthStore((s) => s.token);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState<BudgetTab>("overview");

  const { data: expenses } = useExpensesQuery(budgetId);
  const { data: participants } = useParticipantsQuery(budgetId);
  const { data: settlement } = useSettlementQuery(budgetId);
  const deleteExpense = useDeleteExpenseMutation();
  const { data: budget } = useQuery({
    queryKey: sharingKeys.budget(budgetId),
    queryFn: () => budgetService.getBudget(budgetId),
    enabled: Boolean(budgetId),
  });

  const totalSpent = useMemo(
    () => expenses?.reduce((sum, e) => sum + e.totalAmount, 0) ?? 0,
    [expenses],
  );

  const hasUnsettled = (settlement?.transfers ?? []).length > 0;
  const isGuest = !token && !!readSharingSession(budgetId);
  const isPrivate = budget?.is_private ?? false;

  function handleExpenseClick(expense: Expense) {
    setSelectedExpense(expense);
    setShowExpenseDetail(true);
  }

  function handleAddExpense() {
    setShowAddExpense(true);
  }

  function handleMarkSettled() {
    setTab("settle");
  }

  return (
    <>
    <div className="animate-fade-in-up min-h-screen bg-background">
      <div className="px-4 pt-4 sm:px-6">
        <GuestViewBanner budgetId={budgetId} />
      </div>
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
        mask={isGuest}
        isGuest={isGuest}
        isPrivate={isPrivate}
      />

      {/* Budget tab bar */}
      <div className="sticky top-[57px] sm:top-[65px] z-20 mb-4 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto py-1 px-4 sm:px-6">
          {BUDGET_TABS.map(({ value, icon: Icon, labelKey }) => {
            const isActive = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg min-h-[44px] px-3 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`tabs.${labelKey}`)}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-5xl min-h-[calc(100vh-12rem)] px-4 pb-32 pt-4 [padding-bottom:calc(8rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-24 lg:pb-10 lg:[padding-bottom:2.5rem]">
        {/* Tab content */}
        <div className="space-y-4">
          {tab === "overview" && (
            <SharingExpensesList
              budgetId={budgetId}
              onExpenseClick={handleExpenseClick}
              onAddExpense={handleAddExpense}
              isGuest={isGuest}
              isPrivate={isPrivate}
            />
          )}
          {tab === "members" && <MembersTab budgetId={budgetId} />}
          {tab === "balances" && <BalancesTab budgetId={budgetId} isGuest={isGuest} isPrivate={isPrivate} />}
          {tab === "settle" && (
            <SharingSettlementCard budgetId={budgetId} />
          )}
          {tab === "settings" && <SettingsTab budgetId={budgetId} />}
        </div>
      </main>

      {/* SharingBottomBar moved outside the animate-fade-in-up wrapper below */}

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
      {/* Bottom bar is mounted outside the animated wrapper so its fixed position anchors to the viewport, not the transformed parent. */}
      <SharingBottomBar
        onInvite={() => setInviteOpen(true)}
        onAddExpense={handleAddExpense}
        onMarkSettled={handleMarkSettled}
        hasUnsettled={hasUnsettled}
      />
    </>
  );
}