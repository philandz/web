"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import { CreditCard, PiggyBank, Share2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { Link } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { isFeatureEnabled } from "@/lib/features";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { planKeys } from "@/lib/query-keys";
import { sumFundValue, sumPeriodSummaries } from "@/lib/budget/org-totals";
import { useDebtSummaries } from "@/modules/debt/hooks";
import { useFundSummaries } from "@/modules/portfolio/hooks";
import { planService } from "@/services/plan-service";
import type { Budget } from "@/services/budget-service";

const MAX_STANDARD = 8;

/** Organization-wide answer to "how am I doing this period?" across all budgets. */
export function OrgOverview({ budgets }: { budgets: Budget[] }) {
  const t = useTranslations("dashboard.orgOverview");
  const locale = useLocale();
  const planning = isFeatureEnabled("periodPlanning");
  const savingFund = isFeatureEnabled("savingFund");
  const sharingV2 = isFeatureEnabled("sharingV2");

  const standard = useMemo(
    () => budgets.filter((b) => b.type === "standard").slice(0, MAX_STANDARD),
    [budgets],
  );
  const sharing = sharingV2 ? budgets.filter((b) => b.type === "sharing" && b.status !== "archived") : [];

  // The list API reports `totalCurrentValue` as 0 for saving budgets, so the
  // fund totals have to come from the loaded fund summaries.
  const savingIds = useMemo(
    () => (savingFund ? budgets.filter((b) => b.type === "saving").map((b) => b.id) : []),
    [budgets, savingFund],
  );
  const funds = useFundSummaries(savingIds);

  // Debt books: total owed + the soonest payment across all of them.
  const debtV2 = isFeatureEnabled("debtV2");
  const debtBooks = useMemo(
    () => (debtV2 ? budgets.filter((b) => b.type === "debt" && b.status !== "archived") : []),
    [budgets, debtV2],
  );
  const debtSummaries = useDebtSummaries(debtBooks.map((b) => b.id));
  const debtData = debtSummaries.map((q) => q.data).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const debtTotal = debtData.reduce((sum, d) => sum + d.totalOutstandingMinor, 0);
  const debtNext = debtData
    .filter((d) => d.nextDueDate)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];
  const debtCurrency = debtBooks[0]?.currency ?? "VND";
  const fund = savingFund ? sumFundValue(budgets, funds) : null;

  const summaries = useQueries({
    queries: standard.map((b) => ({
      queryKey: planKeys.summary(b.id, 0),
      queryFn: () => planService.getPeriodSummary(b.id, 0),
      enabled: planning,
      staleTime: 15_000,
    })),
  });

  const items = standard.map((budget, i) => ({ budget, summary: summaries[i]?.data }));
  const totals = sumPeriodSummaries(items);
  const money = (v: number, currency: string) => formatCurrency(v, currency, locale);

  // Ship dark: the whole block only exists when a flag is on.
  if (!planning && !fund && !(sharingV2 && sharing.length > 0) && debtBooks.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="org-overview" aria-label={t("title")}>
      <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>

      {planning && standard.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {totals.currency ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label={t("spent")} value={money(totals.spent, totals.currency)} />
                <StatTile label={t("remaining")} value={money(totals.remaining, totals.currency)} />
                <StatTile
                  className="col-span-2 sm:col-span-1"
                  label={t("available")}
                  value={money(totals.available, totals.currency)}
                />
              </div>
            ) : null}
            <ul className="space-y-2">
              {items.map(({ budget, summary }) => (
                <li key={budget.id}>
                  <Link href={routes.budgetDetail(budget.id)} className="block rounded-lg p-2 hover:bg-muted/50">
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{budget.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {summary
                          ? `${money(summary.totalSpent, budget.currency)} / ${money(summary.totalAvailable, budget.currency)}`
                          : "…"}
                      </span>
                    </div>
                    <ProgressBar
                      spent={summary?.totalSpent ?? 0}
                      planned={summary?.totalAvailable ?? 0}
                      label={budget.name}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {fund ? (
          <StatTile
            label={t("fund")}
            value={
              <span className="inline-flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-500" aria-hidden />
                {money(fund.value, fund.currency)}
              </span>
            }
          />
        ) : null}
        {debtBooks.length > 0 ? (
          <StatTile
            label={t("debt")}
            value={
              <span className="inline-flex items-center gap-2" data-testid="org-debt-total">
                <CreditCard className="h-5 w-5 text-red-500" aria-hidden />
                {debtSummaries.some((q) => q.isLoading) ? "…" : money(debtTotal, debtCurrency)}
              </span>
            }
            hint={
              debtNext
                ? t("debtNext", { date: formatShortDate(debtNext.nextDueDate, locale), amount: money(debtNext.nextDueMinor, debtCurrency) })
                : undefined
            }
          />
        ) : null}
        {sharingV2 && sharing.length > 0 ? (
          <StatTile
            label={t("sharing")}
            value={
              <span className="inline-flex items-center gap-2">
                <Share2 className="h-5 w-5 text-amber-500" aria-hidden />
                {t("sharingCount", { count: sharing.length })}
              </span>
            }
          />
        ) : null}
      </div>
    </section>
  );
}
