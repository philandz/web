"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { useAdjustDebt } from "@/modules/debt/hooks";
import type { DebtAccount } from "@/services/debt-service";

import { todayIso } from "./debt-format";

interface Props {
  open: boolean;
  budgetId: string;
  account: DebtAccount;
  onClose: () => void;
}

/** Corrects the outstanding balance to what the lender shows. Needs a reason; recorded in the history. */
export function AdjustDialog({ open, budgetId, account, onClose }: Props) {
  const t = useTranslations("budget.debt.adjust");
  const toast = useToast();
  const adjust = useAdjustDebt(budgetId, account.id);
  const [value, setValue] = useState(String(account.outstandingMinor));
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayIso());
  const [key] = useState(() => crypto.randomUUID());
  const valid = value !== "" && Number(value) >= 0 && reason.trim() !== "" && !adjust.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    adjust.mutate(
      { newOutstandingMinor: Number(value), reason: reason.trim(), occurredOn: date, idempotencyKey: key },
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: account.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2" data-testid="debt-adjust-form">
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
          <div className="space-y-1.5">
            <Label>{t("newOutstanding")}</Label>
            <AmountInput value={value} onChange={setValue} currency={account.currency || "VND"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-date">{t("date")}</Label>
            <Input id="adj-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">{t("reason")}</Label>
            <Input id="adj-reason" required value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
