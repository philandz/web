"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/components/ui/money-amount";
import { useMarkSettledMutation } from "@/modules/sharing/hooks";
import { useToast } from "@/components/state/toast-provider";
import { Loader2 } from "lucide-react";

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

export function MarkAsSettledDialog({
  transfer,
  budgetId,
  open,
  onOpenChange,
}: MarkAsSettledDialogProps) {
  const [note, setNote] = useState("");
  const toast = useToast();
  const markSettled = useMarkSettledMutation();

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
          toast.success("Settled");
          setNote("");
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Failed to mark as settled");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as settled</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            Mark this transfer as settled?
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="font-medium">{transfer.fromName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{transfer.toName}</span>
            </div>
            <MoneyAmount value={transfer.amount} size="md" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="settle-note">
            Note (optional)
          </label>
          <textarea
            id="settle-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={markSettled.isPending}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={markSettled.isPending}
          >
            {markSettled.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Settling...
              </>
            ) : (
              "Mark as settled"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}