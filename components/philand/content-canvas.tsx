import { ArrowDownRight, ArrowUpRight, Dot, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const points = [22, 26, 24, 31, 28, 35, 33, 40, 36, 44, 39, 46];

function buildPath(values: number[]) {
  const width = 520;
  const height = 190;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const transactions = [
  { name: "AWS Infrastructure", category: "Cloud", date: "Apr 08", amount: -420, status: "Paid" },
  { name: "Stripe Payout", category: "Income", date: "Apr 07", amount: 2380, status: "Completed" },
  { name: "Figma Team", category: "Design", date: "Apr 06", amount: -95, status: "Paid" },
  { name: "Notion", category: "Ops", date: "Apr 05", amount: -24, status: "Paid" }
];

const rightRailItems = [
  { label: "Google Ads", amount: -560, time: "Today" },
  { label: "Freelance Client", amount: 1200, time: "Yesterday" },
  { label: "Server Cost", amount: -210, time: "Apr 06" }
];

export function ContentCanvas() {
  const t = useTranslations("dashboard.dashboard");

  const metrics = [
    { label: t("revenue"), value: "$42,380", delta: "+8.42%", up: true },
    { label: t("expenses"), value: "$12,840", delta: "-2.11%", up: false },
    { label: t("savings"), value: "$29,540", delta: "+4.76%", up: true }
  ];

  const linePath = buildPath(points);

  return (
    <section className="surface-panel rounded-2xl p-4 md:p-5">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full min-w-[220px] md:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-10 rounded-xl border-input bg-background pl-9" placeholder={t("searchPlaceholder")} />
          </div>
          <button className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <SlidersHorizontal className="h-4 w-4" /> {t("filter")}
          </button>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.map((item) => (
              <article key={item.label} className="surface-muted rounded-xl px-4 py-3">
                <p className="text-subtle text-[11px] uppercase tracking-[0.12em]">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                <span className={cn("mt-2 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold", item.up ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500")}>
                  {item.up ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                  {item.delta}
                </span>
              </article>
            ))}
          </div>

          <article className="surface-panel rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t("incomeExpenses")}</h2>
              <button className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <svg viewBox="0 0 520 190" className="w-full" role="img" aria-label="Income and expense chart">
              <defs>
                <linearGradient id="canvas-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
              <path d={linePath} fill="none" stroke="url(#canvas-line)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </article>

          <article className="surface-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t("transactions")}</h2>
              <button className="rounded-full bg-highlight/20 px-2.5 py-1 text-[11px] font-semibold text-foreground">{t("viewAll")}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-subtle py-2 text-left text-xs font-semibold uppercase tracking-[0.08em]">{t("name")}</th>
                    <th className="text-subtle py-2 text-left text-xs font-semibold uppercase tracking-[0.08em]">{t("category")}</th>
                    <th className="text-subtle py-2 text-left text-xs font-semibold uppercase tracking-[0.08em]">{t("date")}</th>
                    <th className="text-subtle py-2 text-right text-xs font-semibold uppercase tracking-[0.08em]">{t("amount")}</th>
                    <th className="text-subtle py-2 text-right text-xs font-semibold uppercase tracking-[0.08em]">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={`${t.name}-${t.date}`} className="border-b border-border/60">
                      <td className="py-3 font-medium text-foreground">{t.name}</td>
                      <td className="py-3 text-muted-foreground">{t.category}</td>
                      <td className="py-3 text-muted-foreground">{t.date}</td>
                      <td className={cn("py-3 text-right font-semibold", t.amount > 0 ? "text-emerald-500" : "text-red-500")}>
                        {t.amount > 0 ? "+" : "-"}${Math.abs(t.amount).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", t.status === "Completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-400")}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <aside className="space-y-3">
          <article className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white dark:from-[#1f233e] dark:to-[#161a31]">
            <p className="text-xs text-slate-300">{t("corporateCard")}</p>
            <p className="mt-5 text-lg font-semibold tracking-[0.12em]">••••  ••••  ••••  9482</p>
            <div className="mt-5 flex items-center justify-between text-xs text-slate-300">
              <span>VALID 09/29</span>
              <span className="font-semibold">PHILAND</span>
            </div>
          </article>

          <article className="surface-panel rounded-xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("recentActivity")}</h3>
              <button className="text-xs text-muted-foreground">{t("seeAll")}</button>
            </div>
            <div className="space-y-2">
              {rightRailItems.map((item) => (
                <div key={`${item.label}-${item.time}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/70">
                  <div className="flex items-center gap-1.5">
                    <Dot className="h-4 w-4 text-lime-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                  <p className={cn("text-sm font-semibold", item.amount > 0 ? "text-emerald-500" : "text-red-500")}>
                    {item.amount > 0 ? "+" : "-"}${Math.abs(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
