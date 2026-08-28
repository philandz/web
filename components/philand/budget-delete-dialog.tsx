"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { useDeleteBudgetMutation } from "@/modules/budget/hooks";

interface BudgetDeleteDialogProps {
  open: boolean;
  budgetId: string;
  budgetName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BudgetDeleteDialog({ open, budgetId, budgetName, onClose, onSuccess }: BudgetDeleteDialogProps) {
  const t = useTranslations("budget.dialogs.delete");
  const toast = useToast();
  const mutation = useDeleteBudgetMutation(budgetId);

  const [confirmName, setConfirmName] = useState("");

  function handleClose() {
    setConfirmName("");
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confirmName !== budgetName) return;
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("success"));
        onSuccess?.();
        handleClose();
      },
      onError: () => toast.error(t("error")),
    });
  }

  const isConfirmValid = confirmName === budgetName;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>

        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">{t("warningTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("warningText")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("confirmLabel")}</Label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={t("confirmPlaceholder")}
              autoComplete="off"
            />
          </div>

          {mutation.isError ? (
            <p className="text-xs text-destructive">{t("error")}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              disabled={mutation.isPending || !isConfirmValid}
            >
              {mutation.isPending ? t("deleting") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
