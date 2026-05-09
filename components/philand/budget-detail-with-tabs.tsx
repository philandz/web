"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { useBurnRateQuery, useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useTransactionsQuery, useBulkTransactionMutation } from "@/modules/transaction/hooks";

import { TransactionFormDrawer } from "@/components/philand/transaction-form-drawer";
import { QuickAddDrawer } from "@/components/philand/quick-add-drawer";
import { TransactionDetailDrawer } from "@/components/philand/transaction-detail-drawer";
import { CategoriesTab } from "@/components/philand/categories-tab";
import { MembersTab } from "@/components/philand/members-tab";
import { SettingsTab } from "@/components/philand/settings-tab";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/state/toast-provider";

import type { Budget, BudgetType } from "@/services/budget-service";
import type { Transaction, TransactionType, TransactionListParams } from "@/services/transaction-service";

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
  // Match the mockup: ₫x.xM / ₫xK.
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sign}₫${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₫${(abs / 1_000).toFixed(0)}K`;
  // fall back to full formatting for tiny values
  return `${sign}${fmt(abs, currency)}`;
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

function fmtDateFull(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

type TypeCfg = { label: string; stripe: string; iconBg: string; iconFg: string; icon: string };

const TYPE_CFG: Record<BudgetType, TypeCfg> = {
  standard: { label: "Standard", stripe: "#38bdf8", iconBg: "#e0f2fe", iconFg: "#0369a1", icon: "⊞" },
  saving: { label: "Saving", stripe: "#22c984", iconBg: "#dcfce7", iconFg: "#15803d", icon: "🐷" },
  debt: { label: "Debt", stripe: "#f05c6e", iconBg: "#fee2e2", iconFg: "#b91c1c", icon: "💳" },
  invest: { label: "Invest", stripe: "#9d74f5", iconBg: "#ede9fe", iconFg: "#6d28d9", icon: "📈" },
  sharing: { label: "Sharing", stripe: "#f59e0b", iconBg: "#fef3c7", iconFg: "#b45309", icon: "🤝" },
};

function TypeIcon({ type }: { type: BudgetType }) {
  const cfg = TYPE_CFG[type] ?? TYPE_CFG.standard;
  return (
    <div
      className="grid h-11 w-11 place-items-center rounded-[12px]"
      style={{ background: cfg.iconBg, color: cfg.iconFg }}
    >
      <span className="text-[18px] leading-none">{cfg.icon}</span>
    </div>
  );
}

function TxTypeChip({ type }: { type: TransactionType }) {
  const isIncome = type === "income";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[2px] text-[10px] font-bold",
        isIncome
          ? "border-income/25 bg-income/10 text-income"
          : "border-expense/25 bg-expense/10 text-expense",
      )}
    >
      {isIncome ? "↑" : "↓"} {isIncome ? "Income" : "Expense"}
    </span>
  );
}

function CatPill({ name, icon, color }: { name: string; icon: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-[2px] text-[11px] font-semibold"
      style={{ background: `${color}18`, borderColor: `${color}33`, color }}
    >
      <span>{icon}</span>
      {name}
    </span>
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

function CategoryDonut({ slices, currency }: { slices: Array<{ id: string; label: string; value: number; color: string }>; currency: string }) {
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
          cats
        </text>
      </svg>

      <ul className="w-full space-y-1.5">
        {arcs.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.label}</span>
            <span className="font-bold tabular-nums text-foreground">{fmtShort(a.value, currency)}</span>
            <span className="w-7 text-right text-muted-foreground">
              {Math.round((a.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetOverviewMock({ budgetId, currency }: { budgetId: string; currency: string }) {
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
    { label: t("remaining"), value: remaining != null ? fmtShort(remaining, currency) : t("noLimit"), color: "text-foreground" },
    { label: t("spendRate"), value: spendRate != null ? `${spendRate}%` : t("noLimit"), color: spendRate != null && spendRate >= 80 ? "text-amber-600 dark:text-amber-400" : "text-foreground" },
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

  const labels = monthKeys.map((d) => new Intl.DateTimeFormat(undefined, { month: "short" }).format(d));
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
      <div className="grid gap-2.5 md:grid-cols-4">
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
              <div className="text-[13px] font-bold text-foreground">Spending Trend</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button variant="ghost" size="sm" className="h-7 px-2">◀</Button>
              <span className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                {new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date())}
              </span>
              <Button variant="ghost" size="sm" className="h-7 px-2">▶</Button>
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
          {slices.length ? <CategoryDonut slices={slices} currency={currency} /> : (
            <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">{t("noCategories")}</div>
          )}
        </Panel>
      </div>

      <Panel className="p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold text-foreground">Recent Transactions</div>
          <span className="cursor-pointer text-[12px] font-semibold text-primary">View all →</span>
        </div>
        <div>
          {recent.map((tx, i) => {
            const isIncome = tx.type === "income";
            return (
              <div
                key={tx.id}
                className={cn("flex items-center gap-3 py-2.5", i < recent.length - 1 && "border-b border-border")}
              >
                <div className={cn(
                  "grid h-[34px] w-[34px] place-items-center rounded-full text-[14px]",
                  isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
                )}>
                  {isIncome ? "↑" : "↓"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">{tx.description}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(tx.date)}</div>
                </div>
                <div className={cn(
                  "text-[14px] font-extrabold tabular-nums",
                  isIncome ? "text-income" : "text-expense",
                )}>
                  {isIncome ? "+" : "−"}{fmtShort(tx.amount, currency)}
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
// Transactions (pixel-spec)
// ---------------------------------------------------------------------------

function BudgetTransactionsMock({ budget }: { budget: Budget }) {
  const t = useTranslations("budget.transactions");
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<NonNullable<TransactionListParams["sortBy"]>>("date");
  const [sortDir, setSortDir] = useState<NonNullable<TransactionListParams["sortDir"]>>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [createOpen, setCreateOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>(undefined);

  const { data: txData, isLoading } = useTransactionsQuery({
    budgetId: budget.id,
    pageSize: 250,
    sortBy: "date",
    sortDir: "desc",
  });
  const transactions = txData?.items ?? [];

  const { data: categories = [] } = useCategoriesQuery(budget.id);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const bulkMutation = useBulkTransactionMutation();

  let filtered = transactions.filter((tx) => {
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && tx.type !== typeFilter) return false;
    if (catFilter && (tx.categoryId ?? "") !== catFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    const aVal = typeof av === "string" ? av.toLowerCase() : av;
    const bVal = typeof bv === "string" ? bv.toLowerCase() : bv;
    if (aVal === bVal) return 0;
    const lt = aVal < bVal;
    return sortDir === "asc" ? (lt ? -1 : 1) : (lt ? 1 : -1);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);
  const hasFilters = Boolean(search || typeFilter || catFilter);

  const totalIncome = filtered.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const totalExpense = filtered.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);

  function clearFilters() {
    setSearch("");
    setTypeFilter(null);
    setCatFilter("");
    setPage(1);
  }

  function toggleSort(key: NonNullable<TransactionListParams["sortBy"]>) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === paged.length ? new Set() : new Set(paged.map((x) => x.id))));
  }

  function handleBulkDelete() {
    bulkMutation.mutate(
      { kind: "delete", ids: Array.from(selected) },
      {
        onSuccess: () => {
          toast.success(t("bulkDeleteSuccess"));
          setSelected(new Set());
          setDetailOpen(false);
          setDetailTx(null);
        },
        onError: () => toast.error(t("bulkDeleteError")),
      },
    );
  }

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <span className="text-[10px] text-muted-foreground">⇅</span>;
    return <span className="text-[10px] text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const ThBtn = ({ label, k, align = "left" }: { label: string; k: NonNullable<TransactionListParams["sortBy"]>; align?: "left" | "right" }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn(
        "inline-flex items-center gap-1 bg-transparent text-[11px] font-bold uppercase tracking-[.06em]",
        sortKey === k ? "text-foreground" : "text-muted-foreground",
        align === "right" && "justify-end",
      )}
    >
      {label} <SortIcon k={k} />
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🔍</span>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-[3px]">
          {([
            { id: "all", v: null, label: "All" },
            { id: "income", v: "income" as const, label: "↑ Income" },
            { id: "expense", v: "expense" as const, label: "↓ Expense" },
          ] as const).map((opt) => {
            const active = typeFilter === opt.v;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTypeFilter(opt.v);
                  setPage(1);
                }}
                className={cn(
                  "h-7 rounded-lg px-3 text-xs font-semibold transition-all",
                  active ? "shadow-soft" : "text-muted-foreground",
                  active && opt.v === "income" && "bg-income/10 text-income",
                  active && opt.v === "expense" && "bg-expense/10 text-expense",
                  active && opt.v === null && "bg-muted text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <SelectNative
          value={catFilter}
          onValueChange={(v) => {
            setCatFilter(v);
            setPage(1);
          }}
          className="h-9 w-auto"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </SelectNative>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="h-8 px-2 text-xs font-semibold text-muted-foreground underline"
          >
            Clear
          </button>
        ) : null}

        <div className="flex-1" />

        <div className="inline-flex">
          <Button
            className="rounded-r-none bg-brand-gradient text-primary-foreground shadow-soft"
            onClick={() => {
              setEditTx(undefined);
              setCreateOpen(true);
            }}
          >
            + New Entry
          </Button>
          <Button
            className="rounded-l-none bg-brand-gradient text-primary-foreground shadow-soft"
            onClick={() => setQuickOpen(true)}
            title="Bulk import"
          >
            ▾
          </Button>
        </div>
      </div>

      {hasFilters ? (
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-full border border-income/25 bg-income/10 px-3 py-1 text-xs font-semibold text-income">
            ↑ {fmtShort(totalIncome, budget.currency)} income
          </div>
          <div className="rounded-full border border-expense/25 bg-expense/10 px-3 py-1 text-xs font-semibold text-expense">
            ↓ {fmtShort(totalExpense, budget.currency)} expense
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} results</div>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5">
          <div className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-primary text-[10px] font-extrabold text-primary-foreground">
            {selected.size}
          </div>
          <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
          <Button
            variant="outline"
            className="ml-auto h-[30px] border-expense/30 text-expense hover:bg-expense/10"
            disabled={bulkMutation.isPending}
            onClick={handleBulkDelete}
          >
            🗑 Delete selected
          </Button>
          <button type="button" className="h-8 px-2 text-xs font-semibold text-muted-foreground" onClick={() => setSelected(new Set())}>
            Cancel
          </button>
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-[22px]">↕</div>
            <div className="text-[14px] font-bold text-foreground">{t("empty")}</div>
            <div className="text-[13px] text-muted-foreground">
              {hasFilters ? "Try adjusting your filters." : "Add your first transaction to get started."}
            </div>
            {!hasFilters ? (
              <Button onClick={() => { setEditTx(undefined); setCreateOpen(true); }} className="bg-brand-gradient text-primary-foreground shadow-soft">
                + New Entry
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 text-left"><ThBtn label="Date" k="date" /></th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">Type</span>
                </th>
                <th className="px-3 py-2.5 text-left"><ThBtn label="Description" k="description" /></th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">Category</span>
                </th>
                <th className="px-3 py-2.5 text-right"><ThBtn label="Amount" k="amount" align="right" /></th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">By</span>
                </th>
                <th className="w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {paged.map((tx) => {
                const isActive = detailOpen && detailTx?.id === tx.id;
                const isHover = hoverRow === tx.id;
                const isIncome = tx.type === "income";
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                return (
                  <tr
                    key={tx.id}
                    onClick={() => {
                      setDetailTx(tx);
                      setDetailOpen(true);
                    }}
                    onMouseEnter={() => setHoverRow(tx.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    className={cn(
                      "border-b border-border transition-colors",
                      isActive ? "bg-primary/5" : isHover ? "bg-muted" : "bg-transparent",
                      "cursor-pointer",
                    )}
                  >
                    <td className="px-3 py-[11px]" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-[11px] whitespace-nowrap text-xs tabular-nums text-muted-foreground">{fmtDate(tx.date)}</td>
                    <td className="px-3 py-[11px]"><TxTypeChip type={tx.type} /></td>
                    <td className="px-3 py-[11px] max-w-[220px]">
                      <div className="truncate text-[13px] font-semibold text-foreground">{tx.description}</div>
                      {tx.tags.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tx.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-muted px-2 py-[1px] text-[10px] font-semibold text-muted-foreground">#{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-[11px]">
                      {cat ? <CatPill name={cat.name} icon={cat.icon} color={cat.color} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-[11px] whitespace-nowrap text-right">
                      <span className={cn(
                        "text-[14px] font-extrabold tabular-nums tracking-[-.02em]",
                        isIncome ? "text-income" : "text-expense",
                      )}>
                        {isIncome ? "+" : "−"}{fmtShort(tx.amount, budget.currency)}
                      </span>
                    </td>
                    <td className="px-3 py-[11px]">
                      <UserAvatar name={tx.createdBy ?? ""} size={24} fallbackClassName="text-[10px]" />
                    </td>
                    <td className="px-2 py-[11px]">
                      <div className={cn("flex gap-1 text-xs text-muted-foreground transition-opacity", isHover || isActive ? "opacity-100" : "opacity-0")}>
                        {tx.isRecurring ? <span title="Recurring">↻</span> : null}
                        {tx.hasAttachment ? <span title="Has attachment">📎</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {paged.length > 0 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={clampedPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ←
              </Button>
              <span className="px-2 text-xs font-semibold text-foreground">{clampedPage} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={clampedPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                →
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <TransactionDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailTx(null);
        }}
        transaction={detailTx}
        budgetId={budget.id}
        currency={budget.currency}
      />

      <TransactionFormDrawer
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditTx(undefined); }}
        budgetId={budget.id}
        transaction={editTx}
        currency={budget.currency}
      />
      <QuickAddDrawer
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        budgetId={budget.id}
        currency={budget.currency}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header + tabs shell (pixel-spec)
// ---------------------------------------------------------------------------

export function BudgetDetailWithTabs({ budget, activeTab, onTab }: { budget: Budget; activeTab: string; onTab: (t: string) => void }) {
  const tDetail = useTranslations("budget.detail");
  const tShell = useTranslations("dashboard.shell");

  const { data: members = [] } = useBudgetMembersQuery(budget.id);
  const { data: envelope } = useBurnRateQuery(budget.id);
  const { data: txData } = useTransactionsQuery({ budgetId: budget.id, pageSize: 1000 });

  const cfg = TYPE_CFG[budget.type] ?? TYPE_CFG.standard;

  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    const items = txData?.items ?? [];
    const income = items.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
    const expense = items.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
    return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
  }, [txData]);

  const spendPct = envelope?.monthlyLimit ? Math.min(100, (envelope.currentSpend / envelope.monthlyLimit) * 100) : null;
  const barColor = spendPct == null ? "hsl(var(--border))" : spendPct >= 100 ? "hsl(var(--expense))" : spendPct >= 80 ? "hsl(38 85% 50%)" : "hsl(var(--primary))";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
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
          <div className="mb-4 flex items-start gap-3.5">
            <TypeIcon type={budget.type} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-[-.3px] text-foreground">{budget.name}</h1>
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: cfg.iconBg, color: cfg.iconFg, borderColor: `${cfg.stripe}33` }}
                >
                  {cfg.label}
                </span>
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold capitalize text-muted-foreground">
                  {budget.myRole}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {budget.currency} · {members.length || budget.memberCount || 1} members
              </div>
            </div>

            {/* Right: Total Budget summary */}
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Budget</span>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              )}>
                {fmt(netBalance, budget.currency)}
              </span>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>+{fmtShort(totalIncome, budget.currency)}</span>
                <span>-</span>
                <span>{fmtShort(totalExpense, budget.currency)}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-border bg-muted px-3.5 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {envelope?.monthlyLimit && envelope.monthlyLimit > 0
                    ? fmtShort(envelope.currentSpend, budget.currency)
                    : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(envelope?.currentSpend ?? 0)} ${budget.currency}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {envelope?.monthlyLimit && envelope.monthlyLimit > 0
                    ? <> / {fmtShort(envelope.monthlyLimit, budget.currency)}</>
                    : <span className="tabular-nums">/∞</span>}
                </span>
              </span>
              {spendPct != null ? (
                <span className={cn(
                  "text-[13px] font-bold tabular-nums",
                  spendPct >= 80 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}>
                  {Math.round(spendPct)}% used
                </span>
              ) : null}
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full transition-all duration-500 ease-smooth" style={{ width: `${spendPct ?? 0}%`, background: barColor }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              {envelope?.monthlyLimit && envelope.monthlyLimit > 0 ? (
                <span className="font-semibold text-income">
                  {fmtShort(envelope.monthlyLimit - envelope.currentSpend, budget.currency)} remaining
                </span>
              ) : null}
            </div>
          </div>

          <div className="-mx-4 sm:-mx-6 flex gap-1 border-b border-border px-4 sm:px-6 overflow-x-auto no-scrollbar -webkit-overflow-scrolling-touch">
            {([
              { id: "overview", label: tDetail("tabOverview") },
              { id: "transactions", label: tDetail("tabTransactions") },
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
                    "-mb-px border-b-2 px-3.5 py-2 text-[13px] transition-colors",
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
        {activeTab === "overview" ? <BudgetOverviewMock budgetId={budget.id} currency={budget.currency} /> : null}
        {activeTab === "transactions" ? <BudgetTransactionsMock budget={budget} /> : null}
        {activeTab === "categories" ? <CategoriesTab budgetId={budget.id} currency={budget.currency} myRole={budget.myRole} /> : null}
        {activeTab === "members" ? <MembersTab budgetId={budget.id} orgId={budget.orgId} myRole={budget.myRole} /> : null}
        {activeTab === "settings" ? <SettingsTab budget={budget} myRole={budget.myRole} /> : null}
      </div>
    </div>
  );
}
