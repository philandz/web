"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Static placeholder data — replace with real API calls when budget/entry
// services are wired to the frontend.
// ---------------------------------------------------------------------------

const KPI_DATA = [
  {
    key: "revenue",
    icon: TrendingUp,
    value: "$42,380",
    delta: "+8.4%",
    trend: "up" as const,
    tone: "income" as const,
  },
  {
    key: "expenses",
    icon: TrendingDown,
    value: "$12,840",
    delta: "-2.1%",
    trend: "down" as const,
    tone: "expense" as const,
  },
  {
    key: "savings",
    icon: PiggyBank,
    value: "$29,540",
    delta: "+4.8%",
    trend: "up" as const,
    tone: "default" as const,
  },
  {
    key: "balance",
    icon: Wallet,
    value: "$84,921",
    delta: "+12.4%",
    trend: "up" as const,
    tone: "default" as const,
  },
];

const CHART_POINTS = [22, 26, 24, 31, 28, 35, 33, 40, 36, 44, 39, 46];
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

const TRANSACTIONS = [
  { name: "AWS Infrastructure", category: "Cloud", date: "Apr 08", amount: -420, status: "paid" },
  { name: "Stripe Payout", category: "Income", date: "Apr 07", amount: 2380, status: "completed" },
  { name: "Figma Team", category: "Design", date: "Apr 06", amount: -95, status: "paid" },
  { name: "Notion", category: "Ops", date: "Apr 05", amount: -24, status: "paid" },
  { name: "Client Transfer", category: "Revenue", date: "Apr 04", amount: 1240, status: "completed" },
];

const CATEGORY_SEGMENTS = [
  { label: "Housing", value: 42, color: "hsl(var(--primary))" },
  { label: "Food", value: 24, color: "hsl(var(--accent))" },
  { label: "Transport", value: 18, color: "hsl(var(--info))" },
  { label: "Other", value: 16, color: "hsl(var(--income))" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLinePath(values: number[], w = 520, h = 120) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[], w = 520, h = 120) {
  const line = buildLinePath(values, w, h);
  return `${line} L${w},${h} L0,${h} Z`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  trend,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  tone: "income" | "expense" | "default";
}) {
  return (
    <article className="surface-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      <span
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          trend === "up" ? "bg-income/15 text-income" : "bg-expense/15 text-expense"
        )}
      >
        {trend === "up" ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {delta}
      </span>
    </article>
  );
}

function SpendingChart() {
  const linePath = buildLinePath(CHART_POINTS);
  const areaPath = buildAreaPath(CHART_POINTS);

  return (
    <div className="overflow-hidden">
      <svg
        viewBox="0 0 520 130"
        className="w-full"
        role="img"
        aria-label="Spending trend"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="dash-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          <linearGradient id="dash-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#dash-area)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#dash-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {CHART_POINTS.map((v, i) => {
          const min = Math.min(...CHART_POINTS);
          const max = Math.max(...CHART_POINTS);
          const x = (i / (CHART_POINTS.length - 1)) * 520;
          const y = 120 - ((v - min) / Math.max(1, max - min)) * 120;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between px-0.5">
        {MONTHS.map((m) => (
          <span key={m} className="text-[10px] text-muted-foreground">{m}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart() {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-28 w-28 shrink-0">
        <g transform="translate(70,70)">
          {CATEGORY_SEGMENTS.map((seg) => {
            const length = (seg.value / 100) * circumference;
            const el = (
              <circle
                key={seg.label}
                r={r}
                cx="0"
                cy="0"
                fill="none"
                stroke={seg.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
              />
            );
            offset += length;
            return el;
          })}
          <circle r="34" cx="0" cy="0" fill="hsl(var(--card))" />
        </g>
      </svg>
      <ul className="space-y-1.5">
        {CATEGORY_SEGMENTS.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="ml-auto font-semibold text-foreground">{seg.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TransactionRow({
  name,
  category,
  date,
  amount,
  status,
}: (typeof TRANSACTIONS)[number]) {
  const positive = amount > 0;
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/60">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
          positive ? "bg-income/15 text-income" : "bg-muted text-muted-foreground"
        )}
      >
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-[11px] text-muted-foreground">{category} · {date}</p>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold", positive ? "text-income" : "text-expense")}>
          {positive ? "+" : "-"}${Math.abs(amount).toLocaleString()}
        </p>
        <p
          className={cn(
            "text-[10px] font-medium capitalize",
            status === "completed" ? "text-income" : "text-muted-foreground"
          )}
        >
          {status}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ContentCanvas() {
  const t = useTranslations("dashboard.dashboard");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_DATA.map((item) => (
          <KpiCard
            key={item.key}
            icon={item.icon}
            label={t(item.key as "revenue" | "expenses" | "savings" | "balance")}
            value={item.value}
            delta={item.delta}
            trend={item.trend}
            tone={item.tone}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Spending trend */}
        <section className="surface-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("incomeExpenses")}</h2>
              <p className="text-[11px] text-muted-foreground">Last 12 months</p>
            </div>
          </div>
          <SpendingChart />
        </section>

        {/* Category breakdown */}
        <section className="surface-panel rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">{t("byCategory")}</h2>
          <DonutChart />
        </section>
      </div>

      {/* Transactions */}
      <section className="surface-panel rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("transactions")}</h2>
          <button className="text-xs font-medium text-primary hover:underline">
            {t("viewAll")}
          </button>
        </div>
        <div className="-mx-1 space-y-0.5">
          {TRANSACTIONS.map((tx) => (
            <TransactionRow key={`${tx.name}-${tx.date}`} {...tx} />
          ))}
        </div>
      </section>
    </div>
  );
}
