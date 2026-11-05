"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, Gauge, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { usePeriodSummaryQuery } from "@/modules/plan/hooks";
import type { CategoryProgress, DailyPoint } from "@/services/plan-service";

import { PeriodSwitcher } from "./period-switcher";

interface PeriodOverviewProps {
  budgetId: string;
  currency: string;
  /** opens the plan tab */
  onEditPlan?: () => void;
}

const STATUS_BAR: Record<CategoryProgress["status"], string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  over: "bg-red-500",
};

/** Standard budget overview driven by the server-side period summary (plan vs actual, rollover included). */
export function PeriodOverview({ budgetId, currency, onEditPlan }: PeriodOverviewProps) {
  const t = useTranslations("budget.period");
  const locale = useLocale();
  const [offset, setOffset] = useState(0);
  const { data: s, isLoading, isError } = usePeriodSummaryQuery(budgetId, offset);
  const money = (v: number) => formatCurrency(v, currency, locale);

  if (isError) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  return (
    <div className="space-y-4" data-testid="period-overview">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodSwitcher offset={offset} onChange={setOffset} from={s?.periodFrom} to={s?.periodTo} />
        {s ? (
          <p className="text-xs text-muted-foreground">
            {offset === 0 ? t("daysLeft", { count: s.daysLeft }) : null}
            {s.rolloverPolicy === "carry_forward" ? ` · ${t("carryForwardOn")}` : ""}
          </p>
        ) : null}
      </div>

      {isLoading || !s ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi icon={TrendingUp} label={t("income")} value={money(s.income)} tone="income" />
            <Kpi icon={TrendingDown} label={t("spent")} value={money(s.totalSpent)} tone="expense" />
            <Kpi
              icon={Wallet}
              label={t("remaining")}
              value={s.totalAvailable > 0 ? money(s.remaining) : t("noPlan")}
              tone={s.totalAvailable > 0 && s.remaining < 0 ? "expense" : "neutral"}
              sub={s.totalAvailable > 0 ? t("ofAvailable", { amount: money(s.totalAvailable) }) : undefined}
            />
            <Kpi
              icon={Gauge}
              label={offset === 0 ? t("safeDaily") : t("usedPct")}
              value={
                offset === 0
                  ? s.totalAvailable > 0
                    ? money(s.safeDailySpend)
                    : "—"
                  : s.totalAvailable > 0
                    ? `${Math.round((s.totalSpent / s.totalAvailable) * 100)}%`
                    : "—"
              }
              tone={s.projectedPct >= 100 ? "warn" : "neutral"}
              sub={offset === 0 && s.totalAvailable > 0 ? t("projected", { pct: Math.round(s.projectedPct) }) : undefined}
            />
          </div>

          {s.transferIn > 0 || s.transferOut > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="period-transfers">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {t("transfersNote", { out: money(s.transferOut), in: money(s.transferIn) })}
            </p>
          ) : null}

          <section className="surface-panel rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t("byCategory")}</h2>
              {onEditPlan ? (
                <button type="button" onClick={onEditPlan} className="text-xs font-medium text-primary hover:underline">
                  {t("editPlan")}
                </button>
              ) : null}
            </div>
            {s.categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("noCategories")}</p>
            ) : (
              <ul className="space-y-3" data-testid="category-progress">
                {s.categories.map((c) => (
                  <ProgressRow key={c.categoryId || "unallocated"} c={c} money={money} unallocatedLabel={t("unallocated")} carryLabel={t("carryIn")} />
                ))}
              </ul>
            )}
          </section>

          <section className="surface-panel rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("dailySpending")}</h2>
            <DailyBars points={s.daily} money={money} />
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  tone: "income" | "expense" | "neutral" | "warn";
}) {
  const color =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : tone === "warn" ? "text-amber-700 dark:text-amber-400" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </p>
        <p className={cn("mt-1 text-lg font-bold tabular-nums", color)}>{value}</p>
        {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function ProgressRow({
  c,
  money,
  unallocatedLabel,
  carryLabel,
}: {
  c: CategoryProgress;
  money: (v: number) => string;
  unallocatedLabel: string;
  carryLabel: string;
}) {
  const width = c.available > 0 ? Math.min(100, (c.spent / c.available) * 100) : c.spent > 0 ? 100 : 0;
  return (
    <li data-status={c.status}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">
          {c.icon ? <span className="mr-1.5">{c.icon}</span> : null}
          {c.categoryId === "" ? unallocatedLabel : c.name}
        </span>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          <span className={cn("font-semibold", c.status === "over" ? "text-expense" : "text-foreground")}>{money(c.spent)}</span>
          {" / "}
          {money(c.available)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(c.pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all", STATUS_BAR[c.status])} style={{ width: `${width}%` }} />
      </div>
      {c.carryIn > 0 ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {carryLabel}: +{money(c.carryIn)}
        </p>
      ) : null}
    </li>
  );
}

function DailyBars({ points, money }: { points: DailyPoint[]; money: (v: number) => string }) {
  const max = Math.max(1, ...points.map((p) => p.expense));
  if (points.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">—</p>;
  return (
    <div className="flex h-24 items-end gap-[2px]" aria-hidden data-testid="daily-bars">
      {points.map((p) => (
        <div
          key={p.date}
          title={`${p.date}: ${money(p.expense)}`}
          className="flex-1 rounded-t bg-primary/70 hover:bg-primary"
          style={{ height: `${Math.max(2, (p.expense / max) * 100)}%`, opacity: p.expense === 0 ? 0.25 : 1 }}
        />
      ))}
    </div>
  );
}

