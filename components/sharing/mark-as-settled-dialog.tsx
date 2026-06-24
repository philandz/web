"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { useMarkSettledMutation, useSettlementsQuery } from "@/modules/sharing/hooks";
import { useToast } from "@/components/state/toast-provider";

type Transfer = {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
};

type MarkAsSettledDialogProps = {
  transfer: Transfer;
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function MarkAsSettledDialog({
  transfer,
  budgetId,
  open,
  onOpenChange,
}: MarkAsSettledDialogProps) {
  const t = useTranslations("sharing");
  const [note, setNote] = useState("");
  const toast = useToast();
  const markSettled = useMarkSettledMutation();
  const { data: existingConfirmations } = useSettlementsQuery(budgetId);

  // Duplicate-guard: is the same (from, to, amount) already settled?
  const duplicate = (existingConfirmations ?? []).find(
    (c) =>
      c.settledAt &&
      c.fromParticipantId === transfer.fromParticipantId &&
      c.toParticipantId === transfer.toParticipantId &&
      c.amount === transfer.amount,
  );

  function handleConfirm() {
    markSettled.mutate(
      {
        budgetId,
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        amount: transfer.amount,
        settledAt: new Date().toISOString(),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("settlement.markSettledSuccess"));
          setNote("");
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t("form.confirm"));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settlement.markSettled")}</DialogTitle>
        </DialogHeader>

        {/* Transfer summary */}
        <div className="surface-soft flex items-center gap-3 rounded-2xl border border-border/60 p-3">
          <UserAvatar name={transfer.fromName} size={32} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <UserAvatar name={transfer.toName} size={32} />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">
              {transfer.fromName} → {transfer.toName}
            </p>
          </div>
          <MoneyAmount value={transfer.amount} currency="VND" size="sm" />
        </div>

        {/* Duplicate warning */}
        {duplicate && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              {t("settlement.duplicateWarning", {
                time: formatTime(
                  typeof duplicate.settledAt === "number"
                    ? duplicate.settledAt
                    : Date.parse(duplicate.settledAt as unknown as string),
                ),
              })}
            </p>
          </div>
        )}

        {/* Note */}
        <div className="mt-3 space-y-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="settle-note"
          >
            {t("settlement.settledNote")}
          </label>
          <textarea
            id="settle-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("settlement.settledNotePlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
          />
        </div>

        <DialogFooter className="mt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={markSettled.isPending}
          >
            {t("form.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={markSettled.isPending}>
            {markSettled.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t("settlement.markSettled")}…
              </>
            ) : (
              t("settlement.markSettled")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}