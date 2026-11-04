"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { BudgetDetailHeader } from "@/components/philand/budget-detail-header";
import { MembersTab } from "@/components/philand/members-tab";
import { SettingsTab } from "@/components/philand/settings-tab";
import { TransactionsTab } from "@/components/philand/transactions-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useDebtAccountsQuery, useDebtSummaryQuery } from "@/modules/debt/hooks";
import type { Budget, BudgetMember } from "@/services/budget-service";

import { AccountDetail } from "./account-detail";
import { CreateAccountDialog } from "./create-account-dialog";
import { isOverdue, repaidPct } from "./debt-format";

export const DEBT_TABS = ["debts", "history", "members", "settings"] as const;
export type DebtTab = (typeof DEBT_TABS)[number];

export function toDebtTab(tab: string | null | undefined): DebtTab {
  return DEBT_TABS.includes(tab as DebtTab) ? (tab as DebtTab) : "debts";
}

interface Props {
  budget: Budget;
  members: BudgetMember[];
  activeTab: DebtTab;
  onTab: (tab: DebtTab) => void;
}

/** A Debt budget once it is a debt book: many loans, schedules and payments instead of a ledger. */
export function DebtBudgetView({ budget, members, activeTab, onTab }: Props) {
  const t = useTranslations("budget.debt");
  const locale = useLocale();
  const role = budget.myRole ?? "";
  const canManage = role === "owner" || role === "manager";
  const canPay = canManage || role === "contributor";
  const money = (v: number) => formatCurrency(v, budget.currency || "VND", locale);
  const summary = useDebtSummaryQuery(budget.id);
  const accounts = useDebtAccountsQuery(budget.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const detail = (accounts.data ?? []).find((a) => a.id === selected);
  const s = summary.data;

  return (
    <div className="animate-fade-in-up space-y-4">
      <BudgetDetailHeader budget={budget} members={members} />

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border" data-testid="debt-tabs">
        {DEBT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === activeTab}
            onClick={() => onTab(tab)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3.5 py-2 text-[13px] transition-colors",
              tab === activeTab
                ? "border-primary font-bold text-primary"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === "debts" ? (
        detail ? (
          <AccountDetail
            budgetId={budget.id}
            account={detail}
            canManage={canManage}
            canPay={canPay}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="space-y-4" data-testid="debt-book">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile label={t("summary.outstanding")} value={s ? money(s.totalOutstandingMinor) : "—"} testId="debt-total-outstanding" />
              <Tile label={t("summary.dueThisMonth")} value={s ? money(s.dueThisMonthMinor) : "—"} />
              <Tile
                label={t("summary.nextDue")}
                value={s?.nextDueDate ? `${formatIsoDate(s.nextDueDate, locale)} · ${money(s.nextDueMinor)}` : "—"}
              />
              <Tile label={t("summary.cost")} value={s ? money(s.totalCostMinor) : "—"} />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("accountsTitle")}</h3>
              {canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="debt-add-account">
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addAccount")}
                </Button>
              ) : null}
            </div>

            {accounts.isLoading ? <Skeleton className="h-28 w-full" /> : null}
            {accounts.data && accounts.data.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              {(accounts.data ?? []).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className="text-left"
                  data-testid="debt-account-card"
                >
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[a.lender, t(`kind.${a.kind}`)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="text-right text-base font-bold tabular-nums">{money(a.outstandingMinor)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-emerald-500" style={{ width: `${repaidPct(a)}%` }} />
                      </div>
                      <p className={cn("text-xs", isOverdue(a) ? "font-medium text-red-500" : "text-muted-foreground")}>
                        {a.status !== "active"
                          ? t(`status.${a.status}`)
                          : a.nextDue?.dueDate
                            ? t("nextDueLine", { date: formatIsoDate(a.nextDue.dueDate, locale), amount: money(a.nextDue.totalMinor) })
                            : t("noSchedule")}
                        {isOverdue(a) ? ` · ${t("overdue")}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )
      ) : null}

      {activeTab === "history" ? (
        <div className="space-y-3" data-testid="debt-legacy-history">
          <p className="text-sm text-muted-foreground">{t("historyHint")}</p>
          <TransactionsTab budgetId={budget.id} currency={budget.currency} readOnly persistFiltersInUrl={false} />
        </div>
      ) : null}
      {activeTab === "members" ? <MembersTab budgetId={budget.id} orgId={budget.orgId} myRole={budget.myRole} /> : null}
      {activeTab === "settings" ? <SettingsTab budget={budget} myRole={budget.myRole} /> : null}

      {createOpen ? <CreateAccountDialog open budgetId={budget.id} onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}

function Tile({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums sm:text-base" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
