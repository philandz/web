"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/state/toast-provider";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useDebtEventsQuery, useDebtLifecycle, useDebtPaymentsQuery, useDebtScheduleQuery } from "@/modules/debt/hooks";
import type { DebtAccount, DebtPaymentKind } from "@/services/debt-service";

import { AdjustDialog } from "./adjust-dialog";
import { PaymentDialog } from "./payment-dialog";
import { TermsEditor } from "./terms-editor";
import { isScheduled } from "./debt-format";

interface Props {
  budgetId: string;
  account: DebtAccount;
  canManage: boolean;
  canPay: boolean;
  onBack: () => void;
}

export function AccountDetail({ budgetId, account, canManage, canPay, onBack }: Props) {
  const t = useTranslations("budget.debt.detail");
  const tk = useTranslations("budget.debt");
  const locale = useLocale();
  const toast = useToast();
  const money = (v: number) => formatCurrency(v, account.currency || "VND", locale);
  const schedule = useDebtScheduleQuery(budgetId, isScheduled(account.repaymentMethod) ? account.id : null);
  const payments = useDebtPaymentsQuery(budgetId, account.id);
  const events = useDebtEventsQuery(budgetId, account.id);
  const life = useDebtLifecycle(budgetId, account.id);
  const [pay, setPay] = useState<DebtPaymentKind | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const active = account.status === "active";
  const fail = () => toast.error(t("error"));
  const rows = schedule.data?.rows ?? [];
  const shown = showAll ? rows : rows.slice(0, 12);

  return (
    <div className="space-y-4" data-testid="debt-detail">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← {t("back")}
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {[account.lender, tk(`kind.${account.kind}`), tk(`method.${account.repaymentMethod}`)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("outstanding")}</p>
            <p className="text-xl font-bold tabular-nums" data-testid="debt-outstanding">
              {money(account.outstandingMinor)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fact label={t("paidPrincipal")} value={money(account.paidPrincipalMinor)} />
            <Fact label={t("totalCost")} value={money(account.totalCostMinor)} />
            <Fact label={t("payoff")} value={account.estimatedPayoffDate ? formatIsoDate(account.estimatedPayoffDate, locale) : "—"} />
            <Fact
              label={t("nextDue")}
              value={
                account.nextDue?.dueDate
                  ? `${formatIsoDate(account.nextDue.dueDate, locale)} · ${money(account.nextDue.totalMinor)}${account.nextDue.estimated ? " ≈" : ""}`
                  : "—"
              }
            />
          </dl>
          {canPay && active ? (
            <div className="flex flex-wrap gap-2">
              {isScheduled(account.repaymentMethod) && account.nextDue ? (
                <Button size="sm" onClick={() => setPay("scheduled")} data-testid="debt-pay-scheduled">
                  {t("paySchedule")}
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setPay("prepayment")} data-testid="debt-pay-prepay">
                {t("prepay")}
              </Button>
              {canManage ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setPay("settlement")}>
                    {t("settle")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
                    {t("adjust")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => life.close.mutate(undefined, { onError: fail })}>
                    {t("close")}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          {canManage && account.status !== "active" ? (
            <Button size="sm" variant="outline" onClick={() => life.reopen.mutate(undefined, { onError: fail })}>
              {t("reopen")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TermsEditor budgetId={budgetId} account={account} canManage={canManage} />

      {isScheduled(account.repaymentMethod) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("scheduleTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("scheduleHint")}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {schedule.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <table className="w-full text-sm" data-testid="debt-schedule">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1">#</th>
                    <th>{t("colDate")}</th>
                    <th className="text-right">{t("colPrincipal")}</th>
                    <th className="text-right">{t("colInterest")}</th>
                    <th className="text-right">{t("colTotal")}</th>
                    <th className="text-right">{t("colBalance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.seq} className="border-t border-border tabular-nums">
                      <td className="py-1">{r.seq}</td>
                      <td>{formatIsoDate(r.dueDate, locale)}</td>
                      <td className="text-right">{money(r.principalMinor)}</td>
                      <td className="text-right">{money(r.interestMinor)}</td>
                      <td className="text-right">{money(r.totalMinor)}</td>
                      <td className="text-right">{money(r.balanceAfterMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {rows.length > 12 ? (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
                {showAll ? t("showLess") : t("showAll", { count: rows.length })}
              </Button>
            ) : null}
            {schedule.data?.payoffDate ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("projection", {
                  date: formatIsoDate(schedule.data.payoffDate, locale),
                  interest: money(schedule.data.totalInterestMinor),
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("paymentsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm" data-testid="debt-payments">
          {(payments.data?.items ?? []).length === 0 ? <p className="text-muted-foreground">{t("noPayments")}</p> : null}
          {(payments.data?.items ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 border-t border-border py-1.5 first:border-t-0">
              <span>
                {formatIsoDate(p.paidOn, locale)} · {tk(`payKind.${p.kind}`)}
                {p.status !== "completed" ? ` · ${p.status}` : ""}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {t("paymentSplit", {
                  principal: money(p.principalMinor),
                  interest: money(p.interestMinor),
                  fee: money(p.feeMinor),
                })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm" data-testid="debt-events">
          {(events.data?.items ?? []).map((e) => (
            <div key={e.id} className="flex justify-between gap-2 border-t border-border py-1.5 first:border-t-0">
              <span>
                {formatIsoDate(e.occurredOn, locale)} · {tk.has(`event.${e.kind}`) ? tk(`event.${e.kind}`) : e.kind}
              </span>
              <span className="tabular-nums text-muted-foreground">{e.amountMinor ? money(e.amountMinor) : ""}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {pay ? <PaymentDialog open budgetId={budgetId} account={account} kind={pay} onClose={() => setPay(null)} /> : null}
      {adjustOpen ? <AdjustDialog open budgetId={budgetId} account={account} onClose={() => setAdjustOpen(false)} /> : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
