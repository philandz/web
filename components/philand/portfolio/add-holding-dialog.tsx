"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { isApiError } from "@/lib/http/errors";
import {
  buildHoldingBody,
  validateHolding,
  type FundingSource,
  type HoldingKind,
} from "@/lib/portfolio/holding-body";
import { useCreateHoldingMutation } from "@/modules/portfolio/hooks";

interface AddHoldingDialogProps {
  open: boolean;
  fundBudgetId: string;
  currency: string;
  onClose: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Adds a deposit / savings account / gold lot to a Saving fund, paid from the cash pocket or from outside. */
export function AddHoldingDialog({ open, fundBudgetId, currency, onClose }: AddHoldingDialogProps) {
  const t = useTranslations("budget.fund.holding");
  const toast = useToast();
  const mutation = useCreateHoldingMutation(fundBudgetId);

  const [kind, setKind] = useState<HoldingKind>("fixed-deposit");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today());
  const [maturity, setMaturity] = useState("");
  const [quantity, setQuantity] = useState("");
  const [goldUnit, setGoldUnit] = useState<"chi" | "luong" | "gram">("chi");
  const [fundingSource, setFundingSource] = useState<FundingSource>("cash-pocket");
  const [error, setError] = useState<string | null>(null);
  // One key per dialog session so a retry or double click creates the holding once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      kind,
      displayName: name,
      currency,
      provider,
      amount: Number(amount),
      annualRate: Number(rate) || 0,
      date,
      maturityDate: maturity || undefined,
      quantity,
      goldUnit,
      pricePerUnit: kind === "gold-lot" ? Number(amount) : undefined,
      fees: 0,
      fundingSource,
      idempotencyKey,
    };
    const invalid = validateHolding(values);
    if (invalid) {
      setError(t(`invalid.${invalid}`));
      return;
    }
    setError(null);
    mutation.mutate(
      { kind, body: buildHoldingBody(values) },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: (err) => {
          const status = isApiError(err) ? err.status : 0;
          setError(status === 412 ? t("errorInsufficient") : t("error"));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" data-testid="add-holding-form">
          <div className="space-y-1.5">
            <Label htmlFor="holding-kind">{t("kind")}</Label>
            <select
              id="holding-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as HoldingKind)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="fixed-deposit">{t("kinds.fixed-deposit")}</option>
              <option value="savings-account">{t("kinds.savings-account")}</option>
              <option value="gold-lot">{t("kinds.gold-lot")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holding-name">{t("name")}</Label>
            <Input id="holding-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holding-provider">{t("provider")}</Label>
            <Input id="holding-provider" value={provider} maxLength={80} onChange={(e) => setProvider(e.target.value)} />
          </div>
          {kind === "gold-lot" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="holding-qty">{t("quantity")}</Label>
                <Input id="holding-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holding-unit">{t("unit")}</Label>
                <select
                  id="holding-unit"
                  value={goldUnit}
                  onChange={(e) => setGoldUnit(e.target.value as "chi" | "luong" | "gram")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="chi">{t("units.chi")}</option>
                  <option value="luong">{t("units.luong")}</option>
                  <option value="gram">{t("units.gram")}</option>
                </select>
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>{kind === "gold-lot" ? t("pricePerUnit") : kind === "fixed-deposit" ? t("principal") : t("balance")}</Label>
            <AmountInput value={amount} onChange={setAmount} currency={currency} />
          </div>
          {kind !== "gold-lot" ? (
            <div className="space-y-1.5">
              <Label htmlFor="holding-rate">{t("rate")}</Label>
              <Input id="holding-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="5.5" />
            </div>
          ) : null}
          <div className={kind === "fixed-deposit" ? "grid grid-cols-2 gap-3" : ""}>
            <div className="space-y-1.5">
              <Label htmlFor="holding-date">{t("date")}</Label>
              <Input id="holding-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {kind === "fixed-deposit" ? (
              <div className="space-y-1.5">
                <Label htmlFor="holding-maturity">{t("maturity")}</Label>
                <Input id="holding-maturity" type="date" required value={maturity} onChange={(e) => setMaturity(e.target.value)} />
              </div>
            ) : null}
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">{t("funding")}</legend>
            {(["cash-pocket", "external"] as const).map((src) => (
              <label key={src} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="funding-source"
                  value={src}
                  checked={fundingSource === src}
                  onChange={() => setFundingSource(src)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t(`fundingOptions.${src}`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`fundingHints.${src}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-expense" data-testid="add-holding-error">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
