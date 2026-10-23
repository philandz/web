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
import { useFundTransferMutation } from "@/modules/portfolio/hooks";
import { isApiError } from "@/lib/http/errors";

interface FundTransferDialogProps {
  open: boolean;
  fundBudgetId: string;
  direction: "deposit" | "withdraw";
  onClose: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Moves money between a Standard budget and the fund's cash pocket (plan R2). */
export function FundTransferDialog({ open, fundBudgetId, direction, onClose }: FundTransferDialogProps) {
  const t = useTranslations("budget.fund");
  const toast = useToast();
  const { data: fund } = useBudgetQuery(open ? fundBudgetId : null);
  const { data: paged } = useBudgetsQuery({
    orgId: open ? (fund?.orgId ?? "") : "",
    type: "standard",
    pageSize: 100,
  });
  const mutation = useFundTransferMutation(fundBudgetId, direction);

  const [counterpartyId, setCounterpartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  // One key per dialog session: a double click or retry cannot move the money twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const options = useMemo(
    () =>
      (paged?.items ?? []).filter(
        (b) =>
          b.currency === fund?.currency &&
          (b.myRole === "owner" || b.myRole === "manager" || b.myRole === "contributor"),
      ),
    [paged, fund],
  );

  const amountNum = Number(amount);
  const canSubmit = Boolean(counterpartyId) && amountNum > 0 && Boolean(date) && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate(
      {
        counterpartyBudgetId: counterpartyId,
        amountMinor: amountNum,
        occurredOn: date,
        note: note.trim() || undefined,
        idempotencyKey,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: (err) => {
          const status = isApiError(err) ? err.status : 0;
          // 412 = incompatible budgets or insufficient cash; the server message tells which
          const insufficient = status === 412 && /insufficient|not enough/i.test((err as Error).message ?? "");
          toast.error(insufficient ? t("errorInsufficient") : status === 412 ? t("errorIncompatible") : t("error"));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{direction === "deposit" ? t("depositTitle") : t("withdrawTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2" data-testid="fund-transfer-form">
          <div className="space-y-1.5">
            <Label htmlFor="fund-counterparty">{t("counterparty")}</Label>
            <select
              id="fund-counterparty"
              required
              value={counterpartyId}
              onChange={(e) => setCounterpartyId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("counterpartyPlaceholder")}</option>
              {options.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {options.length === 0 ? <p className="text-xs text-muted-foreground">{t("noCounterparty")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <AmountInput value={amount} onChange={setAmount} currency={fund?.currency} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fund-date">{t("date")}</Label>
            <Input id="fund-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fund-note">{t("note")}</Label>
            <Input
              id="fund-note"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {direction === "deposit" ? t("submitDeposit") : t("submitWithdraw")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
