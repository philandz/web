"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useFundMovementsQuery, useFundSummaryQuery } from "@/modules/portfolio/hooks";
import { normalizeFundKind } from "@/services/portfolio-service";

import { AddHoldingDialog } from "./add-holding-dialog";
import { FundTransferDialog } from "./fund-transfer-dialog";

interface FundPanelProps {
  budgetId: string;
  canEdit: boolean;
}

/** Saving fund header: value split (cash vs holdings), growth, cash pocket history and money-in/out actions. */
export function FundPanel({ budgetId, canEdit }: FundPanelProps) {
  const t = useTranslations("budget.fund");
  const locale = useLocale();
  const summary = useFundSummaryQuery(budgetId);
  const movements = useFundMovementsQuery(budgetId);
  const [dialog, setDialog] = useState<"deposit" | "withdraw" | null>(null);
  const [addHolding, setAddHolding] = useState(false);

  if (summary.isLoading) return <Skeleton className="h-40 w-full" />;
  const s = summary.data;
  if (!s) return null;
  const money = (v: number) => formatCurrency(v, s.currency, locale);
  const rows = movements.data?.movements ?? [];

  return (
    <div className="space-y-4" data-testid="fund-panel">
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalValue")}</CardTitle>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialog("deposit")}>
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                {t("deposit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("withdraw")}>
                <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                {t("withdraw")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddHolding(true)} data-testid="add-holding">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("holding.add")}
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold tabular-nums" data-testid="fund-total">
            {money(s.totalValue)}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat label={t("cash")} value={money(s.cashBalance)} />
            <Stat label={t("holdings")} value={money(s.holdingsValue)} />
            <Stat label={t("netContributed")} value={money(s.netContributed)} />
            <Stat
              label={t("growth")}
              value={`${s.growth >= 0 ? "+" : ""}${money(s.growth)} (${(s.growthPct * 100).toFixed(1)}%)`}
              tone={s.growth > 0 ? "up" : s.growth < 0 ? "down" : undefined}
            />
          </dl>
          {s.upcoming && s.upcoming.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1 font-medium">{t("upcoming")}</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {s.upcoming.map((u) => (
                  <li key={u.assetId} className="flex justify-between gap-2">
                    <span>
                      {u.displayName} · {formatIsoDate(new Date(u.maturityDate * 1000).toISOString().slice(0, 10), locale)}
                    </span>
                    <span className="tabular-nums">{money(u.expectedAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("movements")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMovements")}</p>
          ) : (
            <ul className="divide-y divide-border" data-testid="fund-movements">
              {rows.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{t(`kind.${normalizeFundKind(m.kind)}`)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatIsoDate(m.occurredOn, locale)}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <span className={m.amountMinor >= 0 ? "tabular-nums text-income" : "tabular-nums text-expense"}>
                    {m.amountMinor >= 0 ? "+" : ""}
                    {money(m.amountMinor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {addHolding ? (
        <AddHoldingDialog open fundBudgetId={budgetId} currency={s.currency} onClose={() => setAddHolding(false)} />
      ) : null}

      {dialog ? (
        <FundTransferDialog open fundBudgetId={budgetId} direction={dialog} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={tone === "up" ? "font-semibold text-income" : tone === "down" ? "font-semibold text-expense" : "font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
