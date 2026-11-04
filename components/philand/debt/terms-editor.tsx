"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useDebtTerms } from "@/modules/debt/hooks";
import type { DebtAccount } from "@/services/debt-service";

import { todayIso } from "./debt-format";

interface Props {
  budgetId: string;
  account: DebtAccount;
  canManage: boolean;
}

/** Rate periods (fixed first, then floating…) and prepayment rules — the user's record of the contract. */
export function TermsEditor({ budgetId, account, canManage }: Props) {
  const t = useTranslations("budget.debt.terms");
  const tk = useTranslations("budget.debt");
  const locale = useLocale();
  const toast = useToast();
  const terms = useDebtTerms(budgetId, account.id);
  const fail = () => toast.error(t("error"));

  const [from, setFrom] = useState(todayIso());
  const [rate, setRate] = useState("");
  const [type, setType] = useState<"fixed" | "floating">("floating");
  const [allowance, setAllowance] = useState("");
  const [feePct, setFeePct] = useState("");
  const [ruleFrom, setRuleFrom] = useState(todayIso());

  const rates = [...account.ratePeriods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="debt-terms">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">{t("ratesTitle")}</h4>
        <ul className="space-y-1 text-sm">
          {rates.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
              <span>
                {formatIsoDate(r.effectiveFrom, locale)} · <b>{r.annualRate}%</b> · {tk(`rateType.${r.rateType}`)}
              </span>
              {canManage && rates.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("delete")}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => r.id && terms.deleteRate.mutate(r.id, { onError: fail })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!rate) return;
              terms.setRate.mutate(
                { effectiveFrom: from, annualRate: rate, rateType: type },
                { onSuccess: () => setRate(""), onError: fail },
              );
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">{t("effectiveFrom")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("rate")}</Label>
              <Input type="number" step="0.01" min={0} value={rate} onChange={(e) => setRate(e.target.value)} className="h-9 w-24" data-testid="debt-new-rate" />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "fixed" | "floating")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="fixed">{tk("rateType.fixed")}</option>
              <option value="floating">{tk("rateType.floating")}</option>
            </select>
            <Button type="submit" size="sm" disabled={!rate || terms.setRate.isPending} data-testid="debt-add-rate">
              {t("addRate")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">{t("rulesTitle")}</h4>
        {account.prepayRules.length === 0 ? <p className="text-sm text-muted-foreground">{t("noRules")}</p> : null}
        <ul className="space-y-1 text-sm">
          {account.prepayRules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
              <span>
                {formatIsoDate(r.validFrom, locale)}
                {r.validTo ? ` → ${formatIsoDate(r.validTo, locale)}` : ""} ·{" "}
                {t("ruleSummary", {
                  allowance: formatCurrency(r.freeAllowancePerMonthMinor, account.currency || "VND", locale),
                  pct: r.feePct,
                })}
              </span>
              {canManage ? (
                <button
                  type="button"
                  aria-label={t("delete")}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => r.id && terms.deleteRule.mutate(r.id, { onError: fail })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              terms.setRule.mutate(
                { validFrom: ruleFrom, freeAllowancePerMonthMinor: Number(allowance) || 0, feePct: feePct || "0" },
                { onSuccess: () => { setAllowance(""); setFeePct(""); }, onError: fail },
              );
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">{t("validFrom")}</Label>
              <Input type="date" value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("allowance")}</Label>
              <AmountInput value={allowance} onChange={setAllowance} currency="VND" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("feePct")}</Label>
              <Input type="number" step="0.01" min={0} value={feePct} onChange={(e) => setFeePct(e.target.value)} className="h-9 w-20" />
            </div>
            <Button type="submit" size="sm" disabled={terms.setRule.isPending}>
              {t("addRule")}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
