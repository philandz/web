"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { useBurnRateQuery, useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useTransactionsQuery, useEntrySummaryQuery } from "@/modules/transaction/hooks";

import { CategoriesTab } from "@/components/philand/categories-tab";
import { MembersTab } from "@/components/philand/members-tab";
import { SettingsTab } from "@/components/philand/settings-tab";
import { TransactionsTab } from "@/components/philand/transactions-tab";

import { budgetTypeMeta } from "@/lib/budget-types";
import { isFeatureEnabled } from "@/lib/features";
import { PeriodOverview } from "./period-overview";
import { TransactionComposer } from "@/components/transaction-composer/transaction-composer";
import { PlanTab } from "./plan-tab";
import type { Budget, BudgetType } from "@/services/budget-service";
import { amountSign, amountToneClass, isInflow, isTransferKind } from "@/lib/transaction-kind";
import { formatCompactMoney, formatShortDate } from "@/lib/format";
import { getActiveLocale } from "@/lib/active-locale";
import { localeToBCP47 } from "@/lib/format";

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

function fmtShort(amount: number, currency: string) {
  return formatCompactMoney(amount, currency);
}

function fmtDate(dateStr: string) {
  return formatShortDate(dateStr);
}

function typeCfg(type: BudgetType) {
  const m = budgetTypeMeta(type);
  return { labelKey: m.labelKey, icon: m.emoji, ...m.hex };
}

function TypeIcon({ type }: { type: BudgetType }) {
  const cfg = typeCfg(type);
  return (
    <div
      className="grid h-11 w-11 place-items-center rounded-[12px]"
      style={{ background: cfg.iconBg, color: cfg.iconFg }}
    >
      <span className="text-[18px] leading-none">{cfg.icon}</span>
    </div>
  );
}

function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card shadow-soft", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Overview (pixel-spec)
// ---------------------------------------------------------------------------

function buildPath(values: number[], w: number, h: number) {
  if (values.length < 2) return { line: "", area: "", pts: [] as string[] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = 100 - ((v - min) / range) * 80;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = "M" + pts.join(" L");
  const area = `${line} L${w},100 L0,100 Z`;
  return { line, area, pts };
}

function CategoryDonut({
  slices,
  currency,
  centerLabel,
}: {
  slices: Array<{ id: string; label: string; value: number; color: string }>;
  currency: string;
  centerLabel: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;

  // Build ring arcs
  const R = 52;
  const r = 34;
  const CX = 70;
  const CY = 70;
  let angle = -Math.PI / 2;

  const arcs = slices.map((slice) => {
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
      `M${x1o.toFixed(1)},${y1o.toFixed(1)}`,
      `A${R},${R} 0 ${lg},1 ${x2o.toFixed(1)},${y2o.toFixed(1)}`,
      `L${x2i.toFixed(1)},${y2i.toFixed(1)}`,
      `A${r},${r} 0 ${lg},0 ${x1i.toFixed(1)},${y1i.toFixed(1)}`,
      "Z",
    ].join(" ");

    return { ...slice, d };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 140 140" className="h-[100px] w-[100px]">
        {arcs.map((a) => (
          <path key={a.id} d={a.d} fill={a.color} />
        ))}
        <circle cx="70" cy="70" r="28" fill="hsl(var(--card))" />
        <text x="70" y="67" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">
          {arcs.length}
        </text>
        <text x="70" y="79" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full space-y-1.5">
        {arcs.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.label}</span>
            <span className="font-bold tabular-nums text-foreground">{fmt(a.value, currency)}</span>
            <span className="w-7 text-right text-muted-foreground">
              {Math.round((a.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetOverviewMock({
  budgetId,
  currency,
  onViewAll,
}: {
  budgetId: string;
  currency: string;
  onViewAll: () => void;
}) {
  const t = useTranslations("budget.overview");
  const { data: envelope } = useBurnRateQuery(budgetId);
  const { data: txData } = useTransactionsQuery({ budgetId, pageSize: 200, sortBy: "date", sortDir: "desc" });
  const { data: categories = [] } = useCategoriesQuery(budgetId);

  const transactions = txData?.items ?? [];
  const income = transactions.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const expense = transactions.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
  const limit = envelope?.monthlyLimit ?? 0;
  const remaining = limit > 0 ? limit - expense : null;
  const spendRate = limit > 0 ? Math.round((expense / limit) * 100) : null;

  const kpis = [
    { label: t("income"), value: fmt(income, currency), color: "text-income" },
    { label: t("expense"), value: fmt(expense, currency), color: "text-expense" },
    // Without a monthly limit "remaining" and "rate" have no meaning: show them only when a limit exists.
    ...(remaining != null && spendRate != null
      ? [
          { label: t("remaining"), value: fmtShort(remaining, currency), color: "text-foreground" },
          { label: t("spendRate"), value: `${spendRate}%`, color: spendRate >= 80 ? "text-amber-700 dark:text-amber-400" : "text-foreground" },
        ]
      : []),
  ];

  // Trend chart uses the last 12 months of expense totals.
  const now = new Date();
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return d;
  });

  const monthlyExpense = monthKeys.map((d) => {
    const y = d.getFullYear();
    const m = d.getMonth();
    let total = 0;
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      const dt = new Date(tx.date);
      if (dt.getFullYear() === y && dt.getMonth() === m) total += tx.amount;
    }
    return total;
  });

  const labels = monthKeys.map((d) => new Intl.DateTimeFormat(localeToBCP47(getActiveLocale()), { month: "short" }).format(d));
  const { line, area, pts } = buildPath(monthlyExpense, 520, 100);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const catSpend = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    if (!tx.categoryId) continue;
    catSpend.set(tx.categoryId, (catSpend.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const palette = ["hsl(var(--primary))", "hsl(38 85% 50%)", "hsl(var(--income))", "hsl(var(--accent))", "hsl(262 80% 60%)"];
  const slices = Array.from(catSpend.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, value], i) => ({
      id,
      value,
      label: catById.get(id)?.name ?? "Other",
      color: palette[i % palette.length],
    }));

  const recent = transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid gap-2.5", kpis.length > 2 ? "md:grid-cols-4" : "md:grid-cols-2")}>
        {kpis.map((k) => (
          <Panel key={k.label} className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-[.07em] text-muted-foreground">{k.label}</div>
            <div className={cn("mt-1 text-[20px] font-extrabold tracking-[-.04em] tabular-nums", k.color)}>
              {k.value}
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <Panel className="p-[18px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-foreground">{t("trendTitle")}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{t("trendSubtitle")}</div>
            </div>
          </div>

          <svg viewBox="0 0 520 110" className="w-full" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="lg-stroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
              <linearGradient id="lg-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".16" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {area ? <path d={area} fill="url(#lg-fill)" /> : null}
            {line ? (
              <path d={line} fill="none" stroke="url(#lg-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {pts.map((pt, i) => {
              const [x, y] = pt.split(",");
              return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />;
            })}
          </svg>
          <div className="mt-1 flex justify-between px-0.5">
            {labels.map((m) => (
              <span key={m} className="text-[10px] text-muted-foreground">{m}</span>
            ))}
          </div>
        </Panel>

        <Panel className="p-[18px]">
          <div className="mb-3 text-[13px] font-bold text-foreground">{t("byCategory")}</div>
          {slices.length ? <CategoryDonut slices={slices} currency={currency} centerLabel={t("categoriesCount", { count: slices.length })} /> : (
            <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">{t("noCategories")}</div>
          )}
        </Panel>
      </div>

      <Panel className="p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold text-foreground">{t("recentTransactions")}</div>
          {recent.length ? (
            <button type="button" onClick={onViewAll} className="text-[12px] font-semibold text-primary hover:underline">
              {t("viewAll")}
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("emptySubtitle")}</p>
        ) : null}
        <div>
          {recent.map((tx, i) => {
            const isIncome = isInflow(tx.type);
            return (
              <div
                key={tx.id}
                className={cn("flex items-center gap-3 py-2.5", i < recent.length - 1 && "border-b border-border")}
              >
                <div className={cn(
                  "grid h-[34px] w-[34px] place-items-center rounded-full text-[14px]",
                  isTransferKind(tx.type) ? "bg-sky-500/10 text-sky-700 dark:text-sky-400" : isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
                )}>
                  {isTransferKind(tx.type)
                    ? "⇄"
                    : (tx.categoryId && catById.get(tx.categoryId)?.icon) || (isIncome ? "↑" : "↓")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">{tx.description}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDate(tx.date)}
                    {tx.categoryId && catById.get(tx.categoryId) ? ` · ${catById.get(tx.categoryId)!.name}` : ""}
                  </div>
                </div>
                <div className={cn(
                  "text-[14px] font-extrabold tabular-nums",
                  isTransferKind(tx.type) ? amountToneClass(tx.type) : isIncome ? "text-income" : "text-expense",
                )}>
                  {amountSign(tx.type)}{fmt(tx.amount, currency)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header + tabs shell (pixel-spec)
// ---------------------------------------------------------------------------

export function BudgetDetailMockup({ budget, activeTab, onTab }: { budget: Budget; activeTab: string; onTab: (t: string) => void }) {
  const planningEnabled = isFeatureEnabled("periodPlanning") && budget.type === "standard";
  const tDetail = useTranslations("budget.detail");
  const tShell = useTranslations("dashboard.shell");

  const { data: members = [] } = useBudgetMembersQuery(budget.id);
  const { data: envelope } = useBurnRateQuery(budget.id);
  const summary = useEntrySummaryQuery(budget.id);

  const cfg = typeCfg(budget.type);
  const tRoot = useTranslations();
  const spendPct = envelope?.monthlyLimit ? Math.min(100, (envelope.currentSpend / envelope.monthlyLimit) * 100) : null;
  const barColor = spendPct == null ? "hsl(var(--border))" : spendPct >= 100 ? "hsl(var(--expense))" : spendPct >= 80 ? "hsl(38 85% 50%)" : "hsl(var(--primary))";

  return (
<div className="mx-auto w-full max-w-5xl">
      <Panel className="overflow-hidden">
        <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.stripe}, ${cfg.stripe}88)` }} />

        <div className="border-b border-border/50 px-5 py-2">
          <Link
            href={routes.budgets}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {tDetail("backToBudgets")}
          </Link>
        </div>

        <div className="px-5 pb-0 pt-4">
          <div className="mb-4 flex flex-wrap items-start gap-3.5">
            <TypeIcon type={budget.type} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-[20px] font-bold tracking-[-.3px] text-foreground">{budget.name}</h1>
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: cfg.iconBg, color: cfg.iconFg, borderColor: `${cfg.stripe}33` }}
                >
                  {tRoot(cfg.labelKey)}
                </span>
                {budget.myRole !== "owner" ? (
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                    {tRoot(`budget.members.role${budget.myRole.charAt(0).toUpperCase()}${budget.myRole.slice(1)}`)}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {budget.currency} · {tRoot("budget.card.memberCount", { count: members.length || budget.memberCount || 1 })}
              </div>
            </div>

            {/* Phones: the balance gets its own row instead of squeezing the name. */}
            <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
              <div className="flex w-full items-baseline justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 sm:w-auto sm:flex-col sm:items-end sm:bg-transparent sm:p-0 sm:text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tDetail("currentBalance")}
                </span>
                <span className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                  {summary.isPending || summary.isError
                    ? "—"
                    : fmt(summary.data?.currentBalance ?? 0, budget.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-border bg-muted px-3.5 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {fmt(envelope?.currentSpend ?? 0, budget.currency)}
                </span>
                {envelope?.monthlyLimit ? <span> / {fmt(envelope.monthlyLimit, budget.currency)}</span> : null}
              </span>
              {spendPct != null ? (
                <span className={cn(
                  "text-[13px] font-bold tabular-nums",
                  spendPct >= 80 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                )}>
                  {tDetail("usedPct", { pct: Math.round(spendPct) })}
                </span>
              ) : null}
            </div>
            {envelope?.monthlyLimit ? (
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full transition-all duration-500 ease-smooth" style={{ width: `${spendPct ?? 0}%`, background: barColor }} />
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{tDetail("spentThisMonthLabel")}</span>
              {envelope?.monthlyLimit ? (
                <span className="font-semibold text-income">
                  {tDetail("remainingAmount", { amount: fmt(envelope.monthlyLimit - envelope.currentSpend, budget.currency) })}
                </span>
              ) : null}
            </div>
          </div>

<div className="-mx-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { id: "overview", label: tDetail("tabOverview") },
              { id: "transactions", label: tDetail("tabTransactions") },
              ...(planningEnabled ? [{ id: "plan", label: tDetail("tabPlan") }] : []),
              { id: "categories", label: tDetail("tabCategories") },
              { id: "members", label: tDetail("tabMembers") },
              { id: "settings", label: tDetail("tabSettings") },
            ] as const).map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTab(tab.id)}
                  className={cn(
                    "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2 text-[13px] transition-colors",
                    active
                      ? "border-primary font-bold text-primary"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="mt-4">
        {activeTab === "overview" ? (
          planningEnabled ? (
            <PeriodOverview budgetId={budget.id} currency={budget.currency} onEditPlan={() => onTab("plan")} />
          ) : (
            <BudgetOverviewMock budgetId={budget.id} currency={budget.currency} onViewAll={() => onTab("transactions")} />
          )
        ) : null}
        {activeTab === "plan" && planningEnabled ? (
          <PlanTab budgetId={budget.id} currency={budget.currency} myRole={budget.myRole} />
        ) : null}
        {activeTab === "transactions" ? <TransactionsTab budgetId={budget.id} currency={budget.currency} /> : null}
        {activeTab === "categories" ? <CategoriesTab budgetId={budget.id} currency={budget.currency} myRole={budget.myRole} /> : null}
{activeTab === "members" ? <MembersTab budgetId={budget.id} orgId={budget.orgId} myRole={budget.myRole} /> : null}
        {activeTab === "settings" ? <SettingsTab budget={budget} myRole={budget.myRole} /> : null}
      </div>

      {budget.type === "standard" ? (
        <TransactionComposer
          budgetId={budget.id}
          currency={budget.currency}
          canWrite={budget.myRole !== "viewer"}
        />
      ) : null}
    </div>
  );
}

// Re-export alias so page.tsx can import by the interface name.
export { BudgetDetailMockup as BudgetDetailWithTabs };
