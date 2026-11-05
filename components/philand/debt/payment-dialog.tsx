"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { isApiError } from "@/lib/http/errors";
import { useBudgetQuery, useBudgetsQuery } from "@/modules/budget/hooks";
import { sameCategoryName } from "@/lib/category-icon";
import { useCategoriesQuery, useCreateCategoryMutation } from "@/modules/category/hooks";
import { useEntrySummaryQuery } from "@/modules/transaction/hooks";
import { useQuoteDebtPayment, useRecordDebtPayment } from "@/modules/debt/hooks";
import type { DebtAccount, DebtPaymentKind, PaymentQuote, PrepayEffect } from "@/services/debt-service";

import { daysUntil, todayIso } from "./debt-format";

interface Props {
  open: boolean;
  budgetId: string;
  account: DebtAccount;
  kind: DebtPaymentKind;
  onClose: () => void;
}

/**
 * Records one payment on a debt account. The numbers come from the server's quote (the schedule
 * is an estimate); every figure can be corrected to what the lender really charged.
 */
export function PaymentDialog({ open, budgetId, account, kind, onClose }: Props) {
  const t = useTranslations("budget.debt.pay");
  const locale = useLocale();
  const toast = useToast();
  const money = (v: number) => formatCurrency(v, account.currency || "VND", locale);

  const { data: debtBudget } = useBudgetQuery(open ? budgetId : null);
  const { data: paged } = useBudgetsQuery({
    orgId: open ? (debtBudget?.orgId ?? "") : "",
    type: "standard",
    pageSize: 100,
  });
  const sources = useMemo(
    () =>
      (paged?.items ?? []).filter(
        (b) =>
          b.currency === (account.currency || "VND") &&
          (b.myRole === "owner" || b.myRole === "manager" || b.myRole === "contributor"),
      ),
    [paged, account.currency],
  );

  const [fromId, setFromId] = useState(account.payFromBudgetId || "");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [prepay, setPrepay] = useState("");
  const [effect, setEffect] = useState<PrepayEffect>("reduce_term");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  const [fee, setFee] = useState("");
  const [feeTouched, setFeeTouched] = useState(false);
  const [categoryId, setCategoryId] = useState(account.interestCategoryId || "");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const effectiveFrom = fromId || sources[0]?.id || "";
  const categories = useCategoriesQuery(open && effectiveFrom ? effectiveFrom : null);
  const createCategory = useCreateCategoryMutation(effectiveFrom);
  const expenseCats = (categories.data ?? []).filter((c) => c.type === "expense" && !c.archived);

  // Pre-select the category remembered for this account, else the "loan interest & fees" one.
  useEffect(() => {
    if (categoryId || expenseCats.length === 0) return;
    const remembered = expenseCats.find((c) => c.id === account.interestCategoryId);
    const byName = expenseCats.find((c) => sameCategoryName(c.name, t("defaultCategory")));
    const pick = remembered ?? byName;
    if (pick) setCategoryId(pick.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseCats.length, account.interestCategoryId]);

  const quoteMut = useQuoteDebtPayment(budgetId, account.id);
  const prepayNum = Number(prepay) || 0;
  const record = useRecordDebtPayment(budgetId, account.id);

  // Re-quote whenever the inputs that drive it change.
  useEffect(() => {
    if (!open) return;
    if (kind === "prepayment" && prepayNum <= 0) {
      setQuote(null);
      return;
    }
    const handle = setTimeout(() => {
      quoteMut.mutate(
        { kind, paidOn, prepayAmountMinor: kind === "prepayment" ? prepayNum : undefined, prepayEffect: effect },
        {
          onSuccess: (q) => {
            setQuote(q);
            setPrincipal(String(q.principalMinor));
            setInterest(String(q.interestMinor));
            if (!feeTouched) setFee(String(q.feeMinor));
          },
        },
      );
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, paidOn, prepayNum, effect]);

  const source = useEntrySummaryQuery(open && effectiveFrom ? effectiveFrom : null);
  const interestNum = Number(interest) || 0;
  const feeNum = Number(fee) || 0;
  const principalNum = Number(principal) || 0;
  const total = principalNum + interestNum + feeNum;
  const needsCategory = interestNum + feeNum > 0;
  const shortOfMoney = source.data ? total > source.data.currentBalance : false;
  const canSubmit =
    Boolean(effectiveFrom) &&
    Boolean(quote) &&
    total > 0 &&
    (!needsCategory || Boolean(categoryId)) &&
    !record.isPending;

  async function quickCategory() {
    const found = expenseCats.find((c) => sameCategoryName(c.name, t("defaultCategory")));
    if (found) {
      setCategoryId(found.id);
      return;
    }
    try {
      const c = await createCategory.mutateAsync({ name: t("defaultCategory"), type: "expense" });
      setCategoryId(c.id);
    } catch {
      toast.error(t("error"));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !quote) return;
    record.mutate(
      {
        kind,
        paidOn,
        principalMinor: principalNum,
        interestMinor: interestNum,
        feeMinor: feeNum,
        fromBudgetId: effectiveFrom,
        categoryId: needsCategory ? categoryId : undefined,
        prepayEffect: kind === "prepayment" ? effect : undefined,
        note: note.trim() || undefined,
        idempotencyKey,
        dueDate: kind === "scheduled" ? quote.dueDate : undefined,
        feeOverridden: kind === "prepayment" && feeNum !== quote.suggestedFeeMinor,
      },
      {
        onSuccess: (res) => {
          toast.success(res.suggestSettle ? t("successPaidOff") : t("success"));
          onClose();
        },
        onError: (err) => {
          const status = isApiError(err) ? err.status : 0;
          toast.error(
            status === 412 && /insufficient|not enough/i.test((err as Error).message ?? "")
              ? t("errorInsufficient")
              : t("error"),
          );
        },
      },
    );
  }

  const feeField = (
    <AmountInput
      variant="field"
      value={fee}
      onChange={(v) => {
        setFee(v);
        setFeeTouched(true);
      }}
      currency={account.currency || "VND"}
      ariaLabel={t("fee")}
      data-testid="debt-fee-input"
    />
  );
  const overdueDays = kind === "scheduled" && quote?.dueDate ? -daysUntil(quote.dueDate) : 0;
  const saved = (o: { totalInterestMinor: number }) => Math.max(0, (quote?.totalInterestBeforeMinor ?? 0) - o.totalInterestMinor);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`title.${kind}`, { name: account.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2" data-testid="debt-payment-form">
          {kind === "prepayment" ? (
            <div className="space-y-1.5">
              <Label>{t("prepayAmount")}</Label>
              <AmountInput value={prepay} onChange={setPrepay} currency={account.currency || "VND"} ariaLabel={t("prepayAmount")} data-testid="debt-prepay-amount" />
              {quote && quote.hasRule ? (
                <p className="text-center text-xs text-muted-foreground" data-testid="debt-allowance">
                  {quote.taxableMinor > 0
                    ? t("allowanceOver", {
                        left: money(quote.allowanceBeforeMinor),
                        taxable: money(quote.taxableMinor),
                        pct: quote.feePct,
                        fee: money(quote.suggestedFeeMinor),
                      })
                    : t("allowanceFree", { left: money(quote.allowanceBeforeMinor) })}
                </p>
              ) : quote ? (
                <p className="text-center text-xs text-muted-foreground" data-testid="debt-allowance">
                  {t("noPrepayFee")}
                </p>
              ) : null}
            </div>
          ) : null}

          {kind === "prepayment" && quote?.outcomes && quote.outcomes.length > 0 ? (
            <fieldset className="space-y-2" data-testid="debt-outcomes">
              <legend className="mb-1 text-sm font-medium">{t("effect")}</legend>
              {quote.outcomes.map((o) => (
                <label
                  key={o.effect}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    effect === o.effect ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="prepay-effect"
                    className="mt-1"
                    checked={effect === o.effect}
                    onChange={() => setEffect(o.effect)}
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{o.effect === "reduce_term" ? t("effectTerm") : t("effectInstallment")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {o.effect === "reduce_term"
                        ? t("outcomeTerm", { date: o.payoffDate ? formatIsoDate(o.payoffDate, locale) : "—", saved: money(saved(o)) })
                        : t("outcomeInstallment", { amount: money(o.installmentMinor), saved: money(saved(o)) })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-pay-from">{t("from")}</Label>
              <select
                id="debt-pay-from"
                required
                value={effectiveFrom}
                onChange={(e) => setFromId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {sources.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {source.data ? (
                <p className={`text-xs ${shortOfMoney ? "font-medium text-destructive" : "text-muted-foreground"}`} data-testid="debt-source-balance">
                  {shortOfMoney ? t("sourceShort", { balance: money(source.data.currentBalance) }) : t("sourceBalance", { balance: money(source.data.currentBalance) })}
                </p>
              ) : null}
              {sources.length === 0 ? <p className="text-xs text-muted-foreground">{t("noSource")}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt-pay-date">{t("date")}</Label>
              <Input id="debt-pay-date" type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>

          {quote ? (
            <div className="space-y-3 rounded-lg border border-border p-3" data-testid="debt-quote">
              {kind === "scheduled" && quote.dueDate ? (
                <p className="text-sm font-medium">
                  {t("dueOn", { date: formatIsoDate(quote.dueDate, locale) })}
                  {overdueDays > 0 ? <span className="ml-2 text-xs font-normal text-destructive">{t("overdueBy", { days: overdueDays })}</span> : null}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t("interestDays", {
                  days: quote.days,
                  from: formatIsoDate(quote.interestFrom, locale),
                  to: formatIsoDate(quote.interestTo, locale),
                  rate: quote.annualRate,
                })}
                {quote.estimated ? ` · ${t("estimated")}` : ""}
              </p>

              {editing ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("principal")}</Label>
                    <AmountInput variant="field" value={principal} onChange={setPrincipal} currency={account.currency || "VND"} ariaLabel={t("principal")} data-testid="debt-principal-input" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("interest")}</Label>
                    <AmountInput variant="field" value={interest} onChange={setInterest} currency={account.currency || "VND"} ariaLabel={t("interest")} data-testid="debt-interest-input" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("fee")}</Label>
                    {feeField}
                  </div>
                </div>
              ) : (
                <dl className="space-y-1 text-sm tabular-nums" data-testid="debt-breakdown">
                  <Row label={t("principal")} value={money(principalNum)} />
                  <Row label={t("interest")} value={money(interestNum)} />
                  <Row label={t("fee")} value={money(feeNum)} />
                </dl>
              )}
              {kind === "prepayment" && feeNum !== quote.suggestedFeeMinor ? (
                <p className="text-xs text-amber-600">{t("feeOverridden", { suggested: money(quote.suggestedFeeMinor) })}</p>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditing((v) => !v)} data-testid="debt-edit-amounts">
                  {editing ? t("hideEdit") : t("editAmounts")}
                </button>
                <p className="text-sm font-semibold" data-testid="debt-total">
                  {t("total")}: {money(total)}
                </p>
              </div>
            </div>
          ) : null}

          {needsCategory ? (
            <div className="space-y-1.5">
              <Label htmlFor="debt-pay-category">{t("category")}</Label>
              <div className="flex gap-2">
                <select
                  id="debt-pay-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("categoryPlaceholder")}</option>
                  {expenseCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  title={t("createCategoryHint", { name: t("defaultCategory") })}
                  aria-label={t("createCategoryHint", { name: t("defaultCategory") })}
                  data-testid="debt-pay-create-category"
                  onClick={quickCategory}
                  disabled={createCategory.isPending || !effectiveFrom}
                >
                  +
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="debt-pay-note">{t("note")}</Label>
            <Input id="debt-pay-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit} data-testid="debt-pay-submit">
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
