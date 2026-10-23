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
import { useCreateTransferMutation } from "@/modules/transaction/hooks";
import { isApiError } from "@/lib/http/errors";

interface TransferDialogProps {
  open: boolean;
  /** budget the money leaves from */
  sourceBudgetId: string;
  onClose: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Standard→standard transfer within the same organisation and currency (plan R1). */
export function TransferDialog({ open, sourceBudgetId, onClose }: TransferDialogProps) {
  const t = useTranslations("budget.transfer");
  const toast = useToast();
  const { data: source } = useBudgetQuery(open ? sourceBudgetId : null);
  const { data: paged } = useBudgetsQuery({
    orgId: open ? (source?.orgId ?? "") : "",
    type: "standard",
    pageSize: 100,
  });
  const mutation = useCreateTransferMutation();

  const [destinationId, setDestinationId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  // One key per dialog session: a double click or retry cannot create two transfers.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const destinations = useMemo(
    () =>
      (paged?.items ?? []).filter(
        (b) =>
          b.id !== sourceBudgetId &&
          b.currency === source?.currency &&
          (b.myRole === "owner" || b.myRole === "manager" || b.myRole === "contributor"),
      ),
    [paged, source, sourceBudgetId],
  );

  const amountNum = Number(amount);
  const canSubmit = Boolean(destinationId) && amountNum > 0 && Boolean(date) && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate(
      {
        sourceBudgetId,
        destinationBudgetId: destinationId,
        amount: amountNum,
        date,
        description: description.trim(),
        idempotencyKey,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: (err) => {
          const precondition = isApiError(err) && err.status === 412;
          toast.error(precondition ? t("errorIncompatible") : t("error"));
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
        <form onSubmit={handleSubmit} className="space-y-4 py-2" data-testid="transfer-form">
          <div className="space-y-1.5">
            <Label>{t("from")}</Label>
            <Input value={source?.name ?? ""} readOnly disabled className="cursor-not-allowed opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-destination">{t("to")}</Label>
            <select
              id="transfer-destination"
              required
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("toPlaceholder")}</option>
              {destinations.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {destinations.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noDestination")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <AmountInput value={amount} onChange={setAmount} currency={source?.currency} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-date">{t("date")}</Label>
            <Input id="transfer-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-note">{t("note")}</Label>
            <Input
              id="transfer-note"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("notePlaceholder")}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
