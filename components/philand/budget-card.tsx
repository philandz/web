"use client";

import { useTranslations } from "next-intl";
import { BarChart2, CreditCard, LayoutGrid, PiggyBank, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Budget, BudgetType, BudgetRole } from "@/services/budget-service";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Per-type visual config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<BudgetType, {
  Icon: LucideIcon;
  iconBg: string;
  stripe: string;
  label: string;
}> = {
  standard: { Icon: LayoutGrid, iconBg: "bg-sky-500/12 text-sky-600 dark:text-sky-400",         stripe: "bg-sky-500",     label: "Standard" },
  saving:   { Icon: PiggyBank,  iconBg: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", stripe: "bg-emerald-500", label: "Saving"   },
  debt:     { Icon: CreditCard, iconBg: "bg-red-500/12 text-red-600 dark:text-red-400",           stripe: "bg-red-500",     label: "Debt"     },
  invest:   { Icon: BarChart2,  iconBg: "bg-violet-500/12 text-violet-600 dark:text-violet-400",  stripe: "bg-violet-500",  label: "Invest"   },
  sharing:  { Icon: Share2,     iconBg: "bg-amber-500/12 text-amber-600 dark:text-amber-400",     stripe: "bg-amber-500",   label: "Sharing"  },
};

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

// ---------------------------------------------------------------------------
// BudgetCard
// ---------------------------------------------------------------------------

interface BudgetCardProps {
  budget: Budget;
  onClick: () => void;
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
  const t = useTranslations("budget.card");
  const { Icon, iconBg, stripe, label } = TYPE_CONFIG[budget.type];

  // Prefer computed pct from limit, fall back to API-provided burnRatePct
  const spendPct =
    budget.envelopeLimit && budget.envelopeLimit > 0
      ? Math.min(100, ((budget.currentSpend ?? 0) / budget.envelopeLimit) * 100)
      : (budget.burnRatePct ?? null);

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

  return (
    <Card
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
                {label}&nbsp;·&nbsp;{budget.currency}
              </p>
            </div>
          </div>

          <span className={cn(
            "mt-0.5 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5",
            "text-[10px] font-semibold capitalize tracking-wide",
            ROLE_STYLES[budget.myRole]
          )}>
            {budget.myRole}
          </span>
        </div>

        {/* ── Row 2: Primary spend metric ── */}
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("spent")}
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground">
            {formatCurrency(budget.currentSpend ?? 0, budget.currency)}
          </p>
        </div>

        {/* ── Row 3: Progress bar — always rendered, filled only when limit exists ── */}
        <div className="mt-4">
          {/* Label row — always takes same vertical space */}
          <div className="flex h-4 items-center justify-between">
            {spendPct != null ? (
              <>
                <span className="text-[11px] text-muted-foreground">
                  {budget.envelopeLimit && budget.envelopeLimit > 0
                    ? `${t("spent")} / ${formatCurrency(budget.envelopeLimit, budget.currency)}`
                    : t("spent")}
                </span>
                <span className={cn("text-[11px] font-semibold tabular-nums", pctColor)}>
                  {Math.round(spendPct)}%
                </span>
              </>
            ) : (
              /* invisible placeholder preserves height */
              <span className="h-4" aria-hidden />
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

        {/* ── Row 4: Footer ── */}
        <div className="mt-4 flex items-center gap-1.5 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            {budget.memberCount ?? 1}&nbsp;{t("members")}
          </span>
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
