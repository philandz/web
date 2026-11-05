"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/state/toast-provider";
import { cn } from "@/lib/utils";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useDebtEventsQuery, useDebtLifecycle, useDebtPaymentsQuery, useDebtScheduleQuery } from "@/modules/debt/hooks";
import type { DebtAccount, DebtEvent, DebtPaymentKind } from "@/services/debt-service";

import { AdjustDialog } from "./adjust-dialog";
import { PaymentDialog } from "./payment-dialog";
import { TermsEditor } from "./terms-editor";
import { balancePath, daysUntil, isOverdue, isScheduled, parsePayload, rateChangeAt, repaidPct } from "./debt-format";

const SECTIONS = ["overview", "schedule", "payments", "terms", "history"] as const;
type Section = (typeof SECTIONS)[number];

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
  const scheduled = isScheduled(account.repaymentMethod);
  const schedule = useDebtScheduleQuery(budgetId, scheduled ? account.id : null);
  const payments = useDebtPaymentsQuery(budgetId, account.id);
  const events = useDebtEventsQuery(budgetId, account.id);
  const life = useDebtLifecycle(budgetId, account.id);
  const [section, setSection] = useState<Section>("overview");
  const [pay, setPay] = useState<DebtPaymentKind | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const active = account.status === "active";
  const fail = () => toast.error(t("error"));
  const rows = schedule.data?.rows ?? [];
  const shown = showAll ? rows : rows.slice(0, 12);
  const overdue = isOverdue(account);
  const dueIn = account.nextDue?.dueDate ? daysUntil(account.nextDue.dueDate) : null;
  const sections = SECTIONS.filter((s) => s !== "schedule" || scheduled);

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
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full bg-emerald-500" style={{ width: `${repaidPct(account)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("repaidPct", { pct: repaidPct(account), opening: money(account.openingOutstandingMinor) })}</p>
          </div>

          {account.nextDue?.dueDate && active ? (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm",
                overdue ? "border-red-300 bg-red-50 dark:bg-red-950/30" : "border-border bg-muted/30",
              )}
              data-testid="debt-next-due"
            >
              <div>
                <p className="font-medium">
                  {t("nextDue")}: {formatIsoDate(account.nextDue.dueDate, locale)} · {money(account.nextDue.totalMinor)}
                  {account.nextDue.estimated ? " ≈" : ""}
                </p>
                <p className={cn("text-xs", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                  {dueIn === null ? "" : overdue ? t("overdueBy", { days: -dueIn }) : dueIn === 0 ? t("dueToday") : t("dueIn", { days: dueIn })}
                </p>
              </div>
              {canPay && scheduled ? (
                <Button size="sm" onClick={() => setPay("scheduled")} data-testid="debt-pay-scheduled">
                  {t("paySchedule")}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {canPay && active ? (
              <Button size="sm" variant={account.nextDue ? "outline" : "default"} onClick={() => setPay("prepayment")} data-testid="debt-pay-prepay">
                {scheduled ? t("prepay") : t("payNow")}
              </Button>
            ) : null}
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button type="button" aria-label={t("more")} data-testid="debt-more" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {active ? (
                    <>
                      <DropdownMenuItem onClick={() => setPay("settlement")}>{t("settle")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAdjustOpen(true)}>{t("adjust")}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmClose(true)}>
                        {t("close")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => life.reopen.mutate(undefined, { onError: fail })}>{t("reopen")}</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border" data-testid="debt-detail-tabs">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === section}
            onClick={() => setSection(s)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] transition-colors",
              s === section ? "border-primary font-bold text-primary" : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`sections.${s}`)}
          </button>
        ))}
      </div>

      {section === "overview" ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fact label={t("paidPrincipal")} value={money(account.paidPrincipalMinor)} />
            <Fact
              label={t("totalCost")}
              value={money(account.totalCostMinor)}
              hint={account.totalPaidMinor > 0 ? t("costShare", { pct: Math.round((account.totalCostMinor / account.totalPaidMinor) * 100) }) : undefined}
            />
            <Fact label={t("payoff")} value={account.estimatedPayoffDate ? formatIsoDate(account.estimatedPayoffDate, locale) : "—"} />
            <Fact
              label={t("interestLeft")}
              value={scheduled && schedule.data ? money(schedule.data.totalInterestMinor) : "—"}
              hint={schedule.data?.estimated ? t("estimated") : undefined}
            />
          </dl>
          {scheduled ? <BalanceChart values={[account.outstandingMinor, ...rows.map((r) => r.balanceAfterMinor)]} label={t("balanceChart")} /> : null}
        </div>
      ) : null}

      {section === "schedule" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("scheduleTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("scheduleHint")}</p>
          </CardHeader>
          <CardContent>
            {schedule.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <table className="hidden w-full text-sm sm:table" data-testid="debt-schedule">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1">#</th>
                      <th>{t("colDate")}</th>
                      <th className="text-right">{t("colRate")}</th>
                      <th className="text-right">{t("colPrincipal")}</th>
                      <th className="text-right">{t("colInterest")}</th>
                      <th className="text-right">{t("colTotal")}</th>
                      <th className="text-right">{t("colBalance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r, i) => (
                      <tr key={r.seq} className={cn("tabular-nums", rateChangeAt(shown, i) ? "border-t-2 border-amber-300" : "border-t border-border")}>
                        <td className="py-1">{r.seq}</td>
                        <td className={cn(i === 0 && overdue && "font-medium text-red-600")}>{formatIsoDate(r.dueDate, locale)}</td>
                        <td className="text-right text-muted-foreground">{r.annualRate}%{r.estimated ? " ≈" : ""}</td>
                        <td className="text-right">{money(r.principalMinor)}</td>
                        <td className="text-right">{money(r.interestMinor)}</td>
                        <td className="text-right font-medium">{money(r.totalMinor)}</td>
                        <td className="text-right">{money(r.balanceAfterMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="space-y-2 sm:hidden" data-testid="debt-schedule-cards">
                  {shown.map((r, i) => (
                    <li key={r.seq} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex justify-between">
                        <span className={cn("font-medium", i === 0 && overdue && "text-red-600")}>
                          #{r.seq} · {formatIsoDate(r.dueDate, locale)}
                        </span>
                        <span className="font-semibold tabular-nums">{money(r.totalMinor)}</span>
                      </div>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {t("paymentSplitShort", { principal: money(r.principalMinor), interest: money(r.interestMinor) })} · {r.annualRate}%
                        {rateChangeAt(shown, i) ? ` · ${t("rateChanged")}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {rows.length > 12 ? (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
                {showAll ? t("showLess") : t("showAll", { count: rows.length })}
              </Button>
            ) : null}
            {schedule.data?.payoffDate ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("projection", { date: formatIsoDate(schedule.data.payoffDate, locale), interest: money(schedule.data.totalInterestMinor) })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === "payments" ? (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm" data-testid="debt-payments">
            {(payments.data?.items ?? []).length === 0 ? <p className="text-muted-foreground">{t("noPayments")}</p> : null}
            {(payments.data?.items ?? []).map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 border-t border-border py-2 first:border-t-0">
                <div>
                  <p className="font-medium">
                    {tk(`payKind.${p.kind}`)}
                    {p.status !== "completed" ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{t(`payStatus.${p.status}`)}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatIsoDate(p.paidOn, locale)} · {t("paymentSplit", { principal: money(p.principalMinor), interest: money(p.interestMinor), fee: money(p.feeMinor) })}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{money(p.totalMinor)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {section === "terms" ? <TermsEditor budgetId={budgetId} account={account} canManage={canManage} /> : null}

      {section === "history" ? (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm" data-testid="debt-events">
            {(events.data?.items ?? []).map((e) => (
              <div key={e.id} className="flex justify-between gap-3 border-t border-border py-2 first:border-t-0">
                <div>
                  <p className="font-medium">{tk.has(`event.${e.kind}`) ? tk(`event.${e.kind}`) : e.kind}</p>
                  <p className="text-xs text-muted-foreground">{formatIsoDate(e.occurredOn, locale)} · {eventDetail(e, money, locale, t)}</p>
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">{e.kind === "created" || e.kind === "adjustment" || e.kind === "payment" ? money(e.amountMinor) : ""}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={t("closeTitle", { name: account.name })}
        description={t("closeBody")}
        destructive
        confirmLabel={t("close")}
        cancelLabel={t("cancel")}
        loading={life.close.isPending}
        onConfirm={() => life.close.mutate(undefined, { onSuccess: () => setConfirmClose(false), onError: fail })}
      />
      {pay ? <PaymentDialog open budgetId={budgetId} account={account} kind={pay} onClose={() => setPay(null)} /> : null}
      {adjustOpen ? <AdjustDialog open budgetId={budgetId} account={account} onClose={() => setAdjustOpen(false)} /> : null}
    </div>
  );
}

function eventDetail(
  e: DebtEvent,
  money: (v: number) => string,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const p = parsePayload(e.payload);
  switch (e.kind) {
    case "rate_change":
      return p.deleted ? t("evRateDeleted") : t("evRate", { rate: String(p.annual_rate ?? ""), type: String(p.rate_type ?? ""), date: formatIsoDate(String(p.effective_from ?? ""), locale) });
    case "prepay_rule_change":
      return t("evRule", { allowance: money(Number(p.free_allowance_per_month_minor ?? 0)), pct: String(p.fee_pct ?? "0") });
    case "adjustment":
      return t("evAdjust", { from: money(Number(p.from ?? 0)), to: money(Number(p.to ?? 0)), reason: String(p.reason ?? "") });
    case "payment":
      return t("paymentSplit", { principal: money(Number(p.principal ?? 0)), interest: money(Number(p.interest ?? 0)), fee: money(Number(p.fee ?? 0)) });
    default:
      return "";
  }
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Balance now → projected zero: the picture of "how long until I am free". */
function BalanceChart({ values, label }: { values: number[]; label: string }) {
  const d = balancePath(values, 600, 120);
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border p-3" data-testid="debt-balance-chart">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <svg viewBox="0 0 600 120" className="h-28 w-full" role="img" aria-label={label} preserveAspectRatio="none">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
