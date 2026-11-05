"use client";

import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp, Users } from "lucide-react";
import { budgetTypeMeta } from "@/lib/budget-types";
import { cardMetricFor } from "@/lib/budget/card-metrics";
import { useDebtSummaryQuery } from "@/modules/debt/hooks";
import { isFeatureEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Budget, BudgetRole } from "@/services/budget-service";
import type { FundSummary } from "@/services/portfolio-service";
import type { SharingBudgetSummary } from "@/modules/sharing/hooks";

// ---------------------------------------------------------------------------
// Per-type visual config
// ---------------------------------------------------------------------------


const ROLE_STYLES: Record<BudgetRole, string> = {
  owner:       "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  manager:     "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  contributor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  viewer:      "bg-slate-500/8 text-slate-500 border-slate-400/20",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Signed money so a negative balance reads as "I owe". */
function formatSigned(amount: number, currency: string) {
  return `${amount > 0 ? "+" : ""}${formatCurrency(amount, currency)}`;
}

// ---------------------------------------------------------------------------
// BudgetCard
// ---------------------------------------------------------------------------

interface BudgetCardProps {
  budget: Budget;
  onClick: () => void;
  /** Loaded fund summary — only for saving budgets. */
  fund?: FundSummary;
  /** Loaded settlement summary — only for sharing budgets. */
  sharingSummary?: SharingBudgetSummary;
}

export function BudgetCard({ budget, onClick, fund, sharingSummary }: BudgetCardProps) {
  const t = useTranslations("budget.card");
  const tRoot = useTranslations();
  const { Icon, iconBg, stripe, labelKey } = budgetTypeMeta(budget.type);

  // A debt book shows what is owed instead of spend against a limit.
  const isDebtBook = budget.type === "debt" && isFeatureEnabled("debtV2");
  const debtSummary = useDebtSummaryQuery(isDebtBook ? budget.id : null);

  const metric = cardMetricFor(budget, {
    fund,
    sharing: sharingSummary,
    savingFundOn: isFeatureEnabled("savingFund"),
  });

  // Prefer computed pct from limit, fall back to API-provided burnRatePct
  const spendPct = metric.kind === "spend" ? metric.pct : null;

  const barColor =
    spendPct == null  ? "" :
    spendPct >= 100   ? "bg-red-500" :
    spendPct >= 80    ? "bg-amber-500" :
    "bg-primary";

  const pctColor =
    spendPct == null  ? "text-muted-foreground" :
    spendPct >= 100   ? "text-red-500" :
    spendPct >= 80    ? "text-amber-600 dark:text-amber-400" :
    "text-muted-foreground";

  // A fund without a loaded summary and without a known value shows "—",
  // not a misleading "0".
  const fundKnown = fund != null || (budget.totalCurrentValue ?? 0) > 0;
  const growthPct = metric.kind === "fund" ? metric.growthPct : null;
  const growthText =
    growthPct == null
      ? "—"
      : `${growthPct >= 0 ? "+" : ""}${(growthPct * 100).toFixed(1)}%`;

  return (
    <Card
      data-testid="budget-card"
      className={cn(
        "group h-full cursor-pointer overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
      )}
      onClick={onClick}
    >
      {/* Type accent stripe */}
      <div className={cn("h-0.5 w-full", stripe)} />

      <CardContent className="flex flex-col gap-0 p-5 pt-4">
        {/* ── Row 1: Icon + Name + Role badge ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconBg)}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-snug text-foreground">
                {budget.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-none text-muted-foreground">
                {tRoot(labelKey)}&nbsp;·&nbsp;{budget.currency}
              </p>
            </div>
          </div>

          {/* The owner badge is noise on your own budgets: only show a role when it is not "owner". */}
          {budget.myRole !== "owner" && (
            <span className={cn(
              "mt-0.5 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5",
              "text-[10px] font-semibold capitalize tracking-wide",
              ROLE_STYLES[budget.myRole]
            )}>
              {budget.myRole}
            </span>
          )}
        </div>

        {/* ── Row 2: Primary metric — spend / fund value / my balance ── */}
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {metric.kind === "spend" && (isDebtBook ? t("debtOwed") : t("spent"))}
            {metric.kind === "fund" && t("fundValue")}
            {metric.kind === "sharing" && t("myBalance")}
          </p>
          <p
            data-testid={
              metric.kind === "fund"
                ? "budget-card-fund-value"
                : metric.kind === "sharing"
                  ? "budget-card-my-balance"
                  : "budget-card-spend-amount"
            }
            className={cn(
              "mt-1 text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground",
              metric.kind === "sharing" && metric.myBalance < 0 && "text-expense",
            )}
          >
            {metric.kind === "spend" &&
              (isDebtBook
                ? debtSummary.data
                  ? formatCurrency(debtSummary.data.totalOutstandingMinor, budget.currency)
                  : "—"
                : formatCurrency(metric.amount, budget.currency))}
            {metric.kind === "fund" &&
              (fundKnown ? formatCurrency(metric.amount, metric.currency) : "—")}
            {metric.kind === "sharing" &&
              formatSigned(metric.myBalance, metric.currency)}
          </p>
        </div>

        {/* ── Row 3: Progress bar — spending budgets only ── */}
        {metric.kind === "spend" && !isDebtBook && (
          <div className="mt-4" data-testid="budget-card-spend-bar">
            {/* Label row — always takes same vertical space */}
            <div className="flex h-4 items-center justify-between">
              {spendPct != null ? (
                <>
                  <span className="text-[11px] text-muted-foreground">
                    {metric.limit != null
                      ? `${t("spent")} / ${formatCurrency(metric.limit, budget.currency)}`
                      : t("spent")}
                  </span>
                  <span className={cn("text-[11px] font-semibold tabular-nums", pctColor)}>
                    {Math.round(spendPct)}%
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">{t("noLimit")}</span>
              )}
            </div>

            {/* Track — always rendered */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {spendPct != null && (
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${Math.min(spendPct, 100)}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Row 4: Footer ── */}
        <div className="mt-4 flex items-center gap-1.5 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          {metric.kind === "fund" ? (
            /* A fund has no members — the growth takes the footer's place. */
            <>
              {growthPct == null ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
              ) : growthPct < 0 ? (
                <TrendingDown className="h-3 w-3 shrink-0 text-expense" />
              ) : (
                <TrendingUp className="h-3 w-3 shrink-0 text-income" />
              )}
              <span
                className={cn(
                  "tabular-nums font-medium",
                  growthPct == null && "font-normal",
                  growthPct != null && (growthPct < 0 ? "text-expense" : "text-income"),
                )}
              >
                {t("fundGrowth")}&nbsp;{growthText}
              </span>
            </>
          ) : metric.kind === "sharing" ? (
            <>
              <span className="truncate">
                {t("totalSpent")}&nbsp;{formatCurrency(metric.totalSpent, metric.currency)}
              </span>
              <span aria-hidden>·</span>
              <Users className="h-3 w-3 shrink-0" />
              <span className="shrink-0">
                {t("memberCount", { count: budget.memberCount ?? 1 })}
              </span>
            </>
          ) : (
            <>
              <Users className="h-3 w-3 shrink-0" />
              <span>
                {t("memberCount", { count: budget.memberCount ?? 1 })}
              </span>
            </>
          )}
          <span
            className="ml-auto font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            View&nbsp;→
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
