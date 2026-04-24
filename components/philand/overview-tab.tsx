"use client";

import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useBurnRateQuery } from "@/modules/budget/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useTransactionsQuery } from "@/modules/transaction/hooks";
import { cn } from "@/lib/utils";
import type { Budget } from "@/services/budget-service";
import type { Transaction } from "@/services/transaction-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

type Tone = "income" | "expense" | "neutral" | "warn";

const TONE: Record<Tone, { value: string; icon: string; iconBg: string }> = {
  income:  { value: "text-emerald-600 dark:text-emerald-400", icon: "text-emerald-500",                  iconBg: "bg-emerald-500/10" },
  expense: { value: "text-red-500",                           icon: "text-red-500",                      iconBg: "bg-red-500/10"     },
  warn:    { value: "text-amber-600 dark:text-amber-400",     icon: "text-amber-500 dark:text-amber-400", iconBg: "bg-amber-500/10"   },
  neutral: { value: "text-foreground",                        icon: "text-muted-foreground",              iconBg: "bg-muted"          },
};

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: Tone;
}

function SummaryCard({ label, value, sub, icon: Icon, tone = "neutral" }: SummaryCardProps) {
  const style = TONE[tone];
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              {label}
            </p>
            <p className={cn("mt-1.5 text-xl font-bold tabular-nums leading-none tracking-tight sm:mt-2 sm:text-2xl", style.value)}>
              {value}
            </p>
            {sub && (
              <p className="mt-1 text-[10px] text-muted-foreground sm:mt-1.5 sm:text-xs">{sub}</p>
            )}
          </div>

          {/* Icon container */}
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9",
            style.iconBg,
          )}>
            <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", style.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Donut / category chart
// ---------------------------------------------------------------------------

interface DonutSlice { label: string; value: number }

const COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function CategoryDonut({ slices, currency }: { slices: DonutSlice[]; currency: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;

  // Build arc paths for a true donut (ring arcs, not pie wedges)
  const R = 52;       // outer radius
  const r = 34;       // inner radius (donut hole)
  const CX = 70;
  const CY = 70;
  let angle = -Math.PI / 2;

  const arcs = slices.map((slice, i) => {
    const sweep = (slice.value / total) * 2 * Math.PI;
    const x1o = CX + R * Math.cos(angle);
    const y1o = CY + R * Math.sin(angle);
    const x1i = CX + r * Math.cos(angle);
    const y1i = CY + r * Math.sin(angle);
    angle += sweep;
    const x2o = CX + R * Math.cos(angle);
    const y2o = CY + R * Math.sin(angle);
    const x2i = CX + r * Math.cos(angle);
    const y2i = CY + r * Math.sin(angle);
    const lg = sweep > Math.PI ? 1 : 0;

    const d = [
      `M${x1o.toFixed(2)},${y1o.toFixed(2)}`,
      `A${R},${R} 0 ${lg},1 ${x2o.toFixed(2)},${y2o.toFixed(2)}`,
      `L${x2i.toFixed(2)},${y2i.toFixed(2)}`,
      `A${r},${r} 0 ${lg},0 ${x1i.toFixed(2)},${y1i.toFixed(2)}`,
      "Z",
    ].join(" ");

    return { d, color: COLORS[i % COLORS.length], ...slice };
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* SVG */}
      <div className="relative shrink-0 mx-auto sm:mx-0">
        <svg viewBox="0 0 140 140" className="h-32 w-32">
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill={a.color} />
          ))}
          {/* Center label */}
          <text
            x={CX} y={CY - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fontWeight="700"
            fill="hsl(var(--foreground))"
          >
            {slices.length}
          </text>
          <text
            x={CX} y={CY + 9}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
          >
            categories
          </text>
        </svg>
      </div>

      {/* Legend */}
      <ul className="flex-1 space-y-2">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
            <span className="flex-1 truncate text-muted-foreground">{a.label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {fmt(a.value, currency)}
            </span>
            <span className="w-8 text-right text-muted-foreground">
              {Math.round((a.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spending trend chart
// ---------------------------------------------------------------------------

function buildPath(values: number[], w: number, h: number) {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area };
}

function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daily = Array(days).fill(0) as number[];

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const d = new Date(tx.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      daily[d.getDate() - 1] += tx.amount;
    }
  }

  const cumul = daily.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] ?? 0) + v);
    return acc;
  }, []);

  const { line, area } = buildPath(cumul, 520, 96);

  return (
    <div>
      <svg
        viewBox="0 0 520 104"
        className="w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="ov-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="ov-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.14" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#ov-fill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="url(#ov-stroke)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {/* X-axis labels */}
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>1</span>
        <span>{Math.ceil(days / 2)}</span>
        <span>{days}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent transaction row
// ---------------------------------------------------------------------------

function RecentTxRow({ tx, currency }: { tx: Transaction; currency: string }) {
  const isIncome = tx.type === "income";
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isIncome
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-500",
      )}>
        {isIncome
          ? <ArrowUpRight className="h-3.5 w-3.5" />
          : <ArrowDownLeft className="h-3.5 w-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">
          {tx.description}
        </p>
        <p className="text-[11px] text-muted-foreground">{fmtDate(tx.date)}</p>
      </div>

      <p className={cn(
        "shrink-0 text-sm font-semibold tabular-nums",
        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
      )}>
        {isIncome ? "+" : "−"}{fmt(tx.amount, currency)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  budget: Budget;
}

export function OverviewTab({ budget }: OverviewTabProps) {
  const t = useTranslations("budget.overview");

  const { data: envelope } = useBurnRateQuery(budget.id);
  const { data: txData } = useTransactionsQuery({
    budgetId: budget.id,
    pageSize: 50,
    sortBy: "date",
    sortDir: "desc",
  });
  const { data: categories = [] } = useCategoriesQuery(budget.id);

  const transactions = txData?.items ?? [];
  const income  = transactions.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const expense = transactions.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
  const limit     = envelope?.monthlyLimit ?? 0;
  const remaining = limit > 0 ? limit - expense : null;
  const spendRate = limit > 0 ? Math.round((expense / limit) * 100) : null;

  // Category breakdown for donut
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const catMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const name = categoryNameMap.get(tx.categoryId ?? "");
    if (!name) continue;
    catMap.set(name, (catMap.get(name) ?? 0) + tx.amount);
  }
  const slices: DonutSlice[] = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const recentTx = transactions.slice(0, 5);
  const hasData  = transactions.length > 0;

  return (
    <div className="space-y-4">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label={t("income")}
          value={fmt(income, budget.currency)}
          icon={TrendingUp}
          tone="income"
        />
        <SummaryCard
          label={t("expense")}
          value={fmt(expense, budget.currency)}
          icon={TrendingDown}
          tone="expense"
        />
        <SummaryCard
          label={t("remaining")}
          value={remaining != null ? fmt(remaining, budget.currency) : t("noLimit")}
          icon={Wallet}
          tone={remaining != null && remaining < 0 ? "expense" : "neutral"}
        />
        <SummaryCard
          label={t("spendRate")}
          value={spendRate != null ? `${spendRate}%` : t("noLimit")}
          icon={Zap}
          tone={
            spendRate != null && spendRate >= 100 ? "expense" :
            spendRate != null && spendRate >= 80  ? "warn" :
            "neutral"
          }
          sub={spendRate != null
            ? `${t("ofLimit")} ${fmt(limit, budget.currency)}`
            : undefined}
        />
      </div>

      {hasData ? (
        <>
          {/* ── Charts ── */}
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Spending trend */}
            <section className="surface-panel rounded-2xl p-5">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                {t("spendingTrend")}
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}
              </p>
              <SpendingChart transactions={transactions} />
            </section>

            {/* Category breakdown */}
            <section className="surface-panel rounded-2xl p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                {t("byCategory")}
              </h2>
              {slices.length > 0 ? (
                <CategoryDonut slices={slices} currency={budget.currency} />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  {t("noCategories")}
                </div>
              )}
            </section>
          </div>

          {/* ── Recent transactions ── */}
          {recentTx.length > 0 && (
            <section className="surface-panel rounded-2xl p-5">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Recent Transactions
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">Last {recentTx.length} entries</p>
              <div className="divide-y divide-border/50">
                {recentTx.map((tx) => (
                  <RecentTxRow key={tx.id} tx={tx} currency={budget.currency} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="surface-panel flex flex-col items-center justify-center rounded-2xl py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{t("emptySubtitle")}</p>
        </div>
      )}
    </div>
  );
}
