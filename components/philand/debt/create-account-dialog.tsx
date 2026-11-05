"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { useBudgetQuery, useBudgetsQuery } from "@/modules/budget/hooks";
import { useCreateDebtAccount } from "@/modules/debt/hooks";
import type { DebtKind, DebtMethod, PrepayRule, RatePeriod } from "@/services/debt-service";

import { DEBT_KINDS, DEBT_METHODS, isScheduled, todayIso } from "./debt-format";

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

interface Props {
  open: boolean;
  budgetId: string;
  onClose: () => void;
}

/** Adds a debt account: the loan terms as the lender's contract states them, tracked from today's balance. */
export function CreateAccountDialog({ open, budgetId, onClose }: Props) {
  const t = useTranslations("budget.debt.create");
  const tk = useTranslations("budget.debt");
  const toast = useToast();
  const create = useCreateDebtAccount(budgetId);
  const { data: book } = useBudgetQuery(open ? budgetId : null);
  const { data: paged } = useBudgetsQuery({ orgId: open ? (book?.orgId ?? "") : "", type: "standard", pageSize: 100 });
  const sources = useMemo(
    () => (paged?.items ?? []).filter((b) => b.currency === (book?.currency ?? "VND")),
    [paged, book],
  );

  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [kind, setKind] = useState<DebtKind>("consumer");
  const [method, setMethod] = useState<DebtMethod>("annuity");
  const [outstanding, setOutstanding] = useState("");
  const [start, setStart] = useState(todayIso());
  const [dueDay, setDueDay] = useState("15");
  const [termMode, setTermMode] = useState<"periods" | "maturity">("periods");
  const [periods, setPeriods] = useState("");
  const [maturity, setMaturity] = useState("");
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"fixed" | "floating">("fixed");
  const [floatFrom, setFloatFrom] = useState("");
  const [floatRate, setFloatRate] = useState("");
  const [allowance, setAllowance] = useState("");
  const [feePct, setFeePct] = useState("");
  const [payFrom, setPayFrom] = useState("");
  const [periodicFee, setPeriodicFee] = useState("");

  const scheduled = isScheduled(method);
  const valid =
    name.trim() !== "" &&
    Number(outstanding) > 0 &&
    Number(rate) >= 0 &&
    rate !== "" &&
    Number(dueDay) >= 1 &&
    Number(dueDay) <= 31 &&
    (!scheduled || (termMode === "periods" ? Number(periods) > 0 : maturity !== "")) &&
    (floatFrom === "") === (floatRate === "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || create.isPending) return;
    const ratePeriods: RatePeriod[] = [{ effectiveFrom: start, annualRate: rate, rateType }];
    if (floatFrom && floatRate) ratePeriods.push({ effectiveFrom: floatFrom, annualRate: floatRate, rateType: "floating" });
    const rules: PrepayRule[] =
      allowance !== "" || feePct !== ""
        ? [{ validFrom: start, freeAllowancePerMonthMinor: Number(allowance) || 0, feePct: feePct || "0" }]
        : [];
    create.mutate(
      {
        name: name.trim(),
        lender: lender.trim(),
        kind,
        repaymentMethod: method,
        openingOutstandingMinor: Number(outstanding),
        trackingStartDate: start,
        maturityDate: scheduled && termMode === "maturity" ? maturity : undefined,
        remainingPeriods: scheduled && termMode === "periods" ? Number(periods) : undefined,
        dueDay: Number(dueDay),
        periodicFeeMinor: Number(periodicFee) || 0,
        dayCount: "actual_365",
        payFromBudgetId: payFrom || undefined,
        ratePeriods,
        prepayRules: rules,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: () => toast.error(t("error")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2" data-testid="debt-create-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-name">{t("name")}</Label>
              <Input id="d-name" required value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-lender">{t("lender")}</Label>
              <Input id="d-lender" value={lender} maxLength={80} onChange={(e) => setLender(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-kind">{t("kind")}</Label>
              <select id="d-kind" value={kind} onChange={(e) => setKind(e.target.value as DebtKind)} className={sel}>
                {DEBT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {tk(`kind.${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-method">{t("method")}</Label>
              <select id="d-method" value={method} onChange={(e) => setMethod(e.target.value as DebtMethod)} className={sel}>
                {DEBT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {tk(`method.${m}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("outstanding")}</Label>
              <AmountInput variant="field" value={outstanding} onChange={setOutstanding} currency="VND" ariaLabel={t("outstanding")} data-testid="debt-outstanding-input" />
              <p className="text-xs text-muted-foreground">{t("outstandingHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-start">{t("start")}</Label>
              <Input id="d-start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-day">{t("dueDay")}</Label>
              <Input id="d-day" type="number" min={1} max={31} required value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("dueDayHint")}</p>
            </div>
            {scheduled ? (
              <div className="space-y-1.5">
                <Label htmlFor="d-term">{termMode === "periods" ? t("periods") : t("maturity")}</Label>
                <div className="flex gap-2">
                  {termMode === "periods" ? (
                    <Input id="d-term" type="number" min={1} value={periods} onChange={(e) => setPeriods(e.target.value)} />
                  ) : (
                    <Input id="d-term" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setTermMode(termMode === "periods" ? "maturity" : "periods")}>
                    {termMode === "periods" ? t("useMaturity") : t("usePeriods")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">{t("rates")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-rate">{t("rate")}</Label>
                <Input id="d-rate" type="number" step="0.01" min={0} required value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-rate-type">{t("rateType")}</Label>
                <select id="d-rate-type" value={rateType} onChange={(e) => setRateType(e.target.value as "fixed" | "floating")} className={sel}>
                  <option value="fixed">{tk("rateType.fixed")}</option>
                  <option value="floating">{tk("rateType.floating")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-float-from">{t("floatFrom")}</Label>
                <Input id="d-float-from" type="date" value={floatFrom} onChange={(e) => setFloatFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-float-rate">{t("floatRate")}</Label>
                <Input id="d-float-rate" type="number" step="0.01" min={0} value={floatRate} onChange={(e) => setFloatRate(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("ratesHint")}</p>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">{t("prepayRule")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("allowance")}</Label>
                <AmountInput variant="field" value={allowance} onChange={setAllowance} currency="VND" ariaLabel={t("allowance")} data-testid="debt-allowance-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-fee-pct">{t("feePct")}</Label>
                <Input id="d-fee-pct" type="number" step="0.01" min={0} value={feePct} onChange={(e) => setFeePct(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-pay-from">{t("payFrom")}</Label>
              <select id="d-pay-from" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} className={sel}>
                <option value="">{t("payFromAny")}</option>
                {sources.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("periodicFee")}</Label>
              <AmountInput variant="field" value={periodicFee} onChange={setPeriodicFee} currency="VND" ariaLabel={t("periodicFee")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || create.isPending} data-testid="debt-create-submit">
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
