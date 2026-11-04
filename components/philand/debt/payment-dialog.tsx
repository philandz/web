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
import { useCategoriesQuery, useCreateCategoryMutation } from "@/modules/category/hooks";
import { useQuoteDebtPayment, useRecordDebtPayment } from "@/modules/debt/hooks";
import type { DebtAccount, DebtPaymentKind, PaymentQuote, PrepayEffect } from "@/services/debt-service";

import { todayIso } from "./debt-format";

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
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const effectiveFrom = fromId || sources[0]?.id || "";
  const categories = useCategoriesQuery(open && effectiveFrom ? effectiveFrom : null);
  const createCategory = useCreateCategoryMutation(effectiveFrom);
  const expenseCats = (categories.data ?? []).filter((c) => c.type === "expense" && !c.archived);

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

  const interestNum = Number(interest) || 0;
  const feeNum = Number(fee) || 0;
  const principalNum = Number(principal) || 0;
  const total = principalNum + interestNum + feeNum;
  const needsCategory = interestNum + feeNum > 0;
  const canSubmit =
    Boolean(effectiveFrom) &&
    Boolean(quote) &&
    total > 0 &&
    (!needsCategory || Boolean(categoryId)) &&
    !record.isPending;

  async function quickCategory() {
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`title.${kind}`, { name: account.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2" data-testid="debt-payment-form">
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
            {sources.length === 0 ? <p className="text-xs text-muted-foreground">{t("noSource")}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="debt-pay-date">{t("date")}</Label>
            <Input id="debt-pay-date" type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>

          {kind === "prepayment" ? (
            <>
              <div className="space-y-1.5">
                <Label>{t("prepayAmount")}</Label>
                <AmountInput value={prepay} onChange={setPrepay} currency={account.currency || "VND"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-pay-effect">{t("effect")}</Label>
                <select
                  id="debt-pay-effect"
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as PrepayEffect)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="reduce_term">{t("effectTerm")}</option>
                  <option value="reduce_installment">{t("effectInstallment")}</option>
                </select>
              </div>
              {quote ? (
                <p className="text-xs text-muted-foreground" data-testid="debt-allowance">
                  {t("allowance", { used: money(quote.allowanceUsedMinor), left: money(quote.allowanceRemainingMinor) })}
                </p>
              ) : null}
            </>
          ) : null}

          {quote ? (
            <div className="space-y-3 rounded-lg border border-border p-3" data-testid="debt-quote">
              <p className="text-xs text-muted-foreground">
                {kind === "scheduled" && quote.dueDate ? `${t("dueOn", { date: formatIsoDate(quote.dueDate, locale) })} · ` : ""}
                {t("interestDays", {
                  days: quote.days,
                  from: formatIsoDate(quote.interestFrom, locale),
                  to: formatIsoDate(quote.interestTo, locale),
                  rate: quote.annualRate,
                })}
                {quote.estimated ? ` · ${t("estimated")}` : ""}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("principal")}</Label>
                  <AmountInput value={principal} onChange={setPrincipal} currency={account.currency || "VND"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("interest")}</Label>
                  <AmountInput value={interest} onChange={setInterest} currency={account.currency || "VND"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("fee")}</Label>
                  <AmountInput
                    value={fee}
                    onChange={(v) => {
                      setFee(v);
                      setFeeTouched(true);
                    }}
                    currency={account.currency || "VND"}
                  />
                </div>
              </div>
              {kind === "prepayment" && feeNum !== quote.suggestedFeeMinor ? (
                <p className="text-xs text-amber-600">{t("feeOverridden", { suggested: money(quote.suggestedFeeMinor) })}</p>
              ) : null}
              <p className="text-sm font-semibold" data-testid="debt-total">
                {t("total")}: {money(total)}
              </p>
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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("categoryPlaceholder")}</option>
                  {expenseCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" data-testid="debt-pay-create-category" onClick={quickCategory} disabled={createCategory.isPending || !effectiveFrom}>
                  {t("createCategory")}
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
