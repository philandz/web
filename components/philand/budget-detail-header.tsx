"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft, BarChart2, CreditCard, LayoutGrid,
  PiggyBank, Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "@/i18n/navigation";
import { useBurnRateQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { Budget, BudgetMember, BudgetType } from "@/services/budget-service";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Per-type config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<BudgetType, {
  Icon: LucideIcon;
  iconBg: string;
  badge: string;
  label: string;
  stripe: string;
}> = {
  standard: {
    Icon: LayoutGrid,
    iconBg: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    badge:  "border-sky-200 bg-sky-500/10 text-sky-600 dark:border-sky-800 dark:text-sky-400",
    label:  "Standard",
    stripe: "bg-sky-500",
  },
  saving: {
    Icon: PiggyBank,
    iconBg: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    badge:  "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400",
    label:  "Saving",
    stripe: "bg-emerald-500",
  },
  debt: {
    Icon: CreditCard,
    iconBg: "bg-red-500/12 text-red-600 dark:text-red-400",
    badge:  "border-red-200 bg-red-500/10 text-red-600 dark:border-red-800 dark:text-red-400",
    label:  "Debt",
    stripe: "bg-red-500",
  },
  invest: {
    Icon: BarChart2,
    iconBg: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    badge:  "border-violet-200 bg-violet-500/10 text-violet-600 dark:border-violet-800 dark:text-violet-400",
    label:  "Invest",
    stripe: "bg-violet-500",
  },
  sharing: {
    Icon: Share2,
    iconBg: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    badge:  "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-800 dark:text-amber-400",
    label:  "Sharing",
    stripe: "bg-amber-500",
  },
};

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
  const profile = useAuthStore((s) => s.profile);
  const { data: envelope } = useBurnRateQuery(budget.id);

  const { Icon, iconBg, badge, label, stripe } = TYPE_CONFIG[budget.type];
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
                {label}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] capitalize text-muted-foreground sm:text-xs">
              {budget.myRole}&nbsp;·&nbsp;{budget.currency}
            </p>
          </div>

          {/* Right: avatars */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Stacked member avatars — desktop only */}
            {visibleMembers.length > 0 && (
              <div className="hidden items-center sm:flex">
                <div className="flex -space-x-2">
                  {visibleMembers.map((m) => (
                    <UserAvatar
                      key={m.userId}
                      name={m.displayName}
                      src={m.userId === profile?.id ? (profile?.avatar ?? undefined) : undefined}
                      size={28}
                      className="ring-2 ring-card"
                      fallbackClassName="text-[9px]"
                    />
                  ))}
                </div>
                {overflow > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Envelope burn-rate bar ── */}
        {spendPct != null && envelope && (
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
                spendPct >= 80  ? "text-amber-600 dark:text-amber-400" :
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
          </div>
        )}
      </div>
    </div>
  );
}
