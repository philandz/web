"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Pencil, Settings, Trash2, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "@/i18n/navigation";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useBurnRateQuery } from "@/modules/budget/hooks";
import { useEntrySummaryQuery } from "@/modules/transaction/hooks";
import { useAuthStore } from "@/lib/auth-store";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { BudgetEditDialog } from "./budget-edit-dialog";
import { BudgetDeleteDialog } from "./budget-delete-dialog";
import type { Budget, BudgetMember, BudgetType } from "@/services/budget-service";
import { budgetTypeMeta } from "@/lib/budget-types";
import { isFeatureEnabled } from "@/lib/features";
import { useDebtSummaryQuery } from "@/modules/debt/hooks";
import { useFundSummaryQuery } from "@/modules/portfolio/hooks";

// ---------------------------------------------------------------------------
// Per-type config
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BudgetDetailHeaderProps {
  budget: Budget;
  members: BudgetMember[];
}

export function BudgetDetailHeader({
  budget,
  members,
}: BudgetDetailHeaderProps) {
  const t = useTranslations("budget.detail");
  const tFund = useTranslations("budget.fund");
  const profile = useAuthStore((s) => s.profile);
  // A Saving budget is a fund once the flag is on: no income/expense ledger and no
  // spending limit, so the header shows the fund's value instead.
  const isFund = budget.type === "saving" && isFeatureEnabled("savingFund");
  // A Debt budget is a debt book once its flag is on: the header shows what is owed.
  const isDebt = budget.type === "debt" && isFeatureEnabled("debtV2");
  const tDebt = useTranslations("budget.debt.summary");
  const debt = useDebtSummaryQuery(isDebt ? budget.id : null);
  const { data: envelope } = useBurnRateQuery(isFund || isDebt ? null : budget.id);
  const summary = useEntrySummaryQuery(isFund || isDebt ? null : budget.id);
  const fund = useFundSummaryQuery(isFund ? budget.id : null);
  const { orgRole } = useTenantContext();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Use budget-level role (budget.myRole) as the authoritative source for
  // edit/delete permissions. Falls back to org-level owner role for invest
  // budgets where orgRole may not reflect budget-level ownership.
  const isOwner = budget.myRole === "owner" || orgRole === "owner";

  const { Icon, iconBg, badge, labelKey, stripe } = budgetTypeMeta(budget.type);
  const tRoot = useTranslations();
  const visibleMembers = members.slice(0, 4);
  const overflow = members.length - visibleMembers.length;

  const spendPct = envelope?.burnRatePct ?? null;
  const barColor =
    spendPct == null ? "" :
    spendPct >= 100  ? "bg-red-500" :
    spendPct >= 80   ? "bg-amber-500" :
    "bg-primary";

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: budget.currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="surface-panel overflow-hidden rounded-2xl">
      {/* ── Type-colored top stripe ── */}
      <div className={cn("h-0.5 w-full", stripe)} />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-border/50 px-5 py-2 md:px-6">
        <Link
          href={routes.budgets}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToBudgets")}
        </Link>
      </div>

      {/* ── Main header ── */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Type icon — slightly smaller on mobile */}
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
            iconBg,
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-xl">
                {budget.name}
              </h1>
              <Badge variant="outline" className={cn(badge, "text-[10px] sm:text-xs")}>
                {tRoot(labelKey)}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="text-[11px] capitalize text-muted-foreground sm:text-xs">
                {budget.myRole}&nbsp;·&nbsp;{budget.currency}
              </p>
              {members.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                  <Users className="h-3 w-3" />
                  {members.length}
                </span>
              )}
            </div>
          </div>

          {/* Right: what is owed (Debt book) */}
          {isDebt ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5" data-testid="debt-header">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{tDebt("outstanding")}</p>
              <p className="text-sm font-bold tabular-nums text-foreground sm:text-base" data-testid="debt-total-outstanding">
                {debt.data ? fmt(debt.data.totalOutstandingMinor) : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground sm:text-xs">{tDebt("dueThisMonth")}</p>
              <p className="text-xs tabular-nums text-foreground">{debt.data ? fmt(debt.data.dueThisMonthMinor) : "—"}</p>
            </div>
          </div>
          ) : isFund ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5" data-testid="fund-header">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                {tFund("totalValue")}
              </p>
              <p className="text-sm font-bold tabular-nums text-foreground sm:text-base">
                {fund.data ? fmt(fund.data.totalValue) : "—"}
              </p>
            </div>
            {/* Cash/growth repeat the fund panel right below: keep them for wide screens only. */}
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground sm:text-xs">{tFund("cash")}</p>
                <p className="text-xs tabular-nums text-foreground">
                  {fund.data ? fmt(fund.data.cashBalance) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground sm:text-xs">{tFund("growth")}</p>
                <p className={cn(
                  "text-xs tabular-nums",
                  (fund.data?.growth ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-400" :
                  (fund.data?.growth ?? 0) < 0 ? "text-red-500" : "text-foreground",
                )}>
                  {fund.data ? `${fund.data.growth > 0 ? "+" : ""}${fmt(fund.data.growth)}` : "—"}
                </p>
              </div>
            </div>
          </div>
          ) : (
          /* Right: all-time balance summary */
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {/* Current balance — primary metric */}
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                {t("currentBalance")}
              </p>
              <p className="text-sm font-bold tabular-nums text-foreground sm:text-base">
                {(() => {
                  if (summary.isPending || summary.isError) return "—";
                  return fmt(summary.data?.currentBalance ?? 0);
                })()}
              </p>
            </div>
            {/* Income + Expense secondary row */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  {t("totalIncome")}
                </p>
                <p className="text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                  {(() => {
                    if (summary.isPending || summary.isError) return "—";
                    return fmt(summary.data?.totalIncome ?? 0);
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  {t("totalExpense")}
                </p>
                <p className="text-xs tabular-nums text-red-500">
                  {(() => {
                    if (summary.isPending || summary.isError) return "—";
                    return fmt(summary.data?.totalExpense ?? 0);
                  })()}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Owner-only overflow menu */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button
                  className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t("menu")}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Envelope burn-rate bar ── */}
        {spendPct != null && envelope && envelope.monthlyLimit > 0 && (
          <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2.5 sm:mt-4 sm:px-4 sm:py-3">
            {/* Spend / limit row */}
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1 text-sm">
                <span className="font-semibold tabular-nums text-foreground">
                  {fmt(envelope.currentSpend)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {fmt(envelope.monthlyLimit)}
                </span>
              </div>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                spendPct >= 100 ? "text-red-500" :
                spendPct >= 80  ? "text-amber-700 dark:text-amber-400" :
                "text-foreground",
              )}>
                {Math.round(spendPct)}%
              </span>
            </div>

            {/* Progress track */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted sm:h-2">
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${Math.min(spendPct, 100)}%` }}
              />
            </div>

            {/* Spent this month / remaining row */}
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t("spentThisMonth")}</span>
              {envelope.monthlyLimit > envelope.currentSpend ? (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {fmt(envelope.monthlyLimit - envelope.currentSpend)}&nbsp;{t("remaining")}
                </span>
              ) : (
                <span className="font-semibold text-red-500">
                  {fmt(envelope.currentSpend - envelope.monthlyLimit)}&nbsp;{t("overBudget")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <BudgetEditDialog
        open={editOpen}
        budget={budget}
        onClose={() => setEditOpen(false)}
      />
      <BudgetDeleteDialog
        open={deleteOpen}
        budgetId={budget.id}
        budgetName={budget.name}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
