"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/state/toast-provider";
import { useUpdateBudgetMutation } from "@/modules/budget/hooks";
import type { Budget } from "@/services/budget-service";

interface BudgetEditDialogProps {
  open: boolean;
  budget: Budget;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BudgetEditDialog({ open, budget, onClose, onSuccess }: BudgetEditDialogProps) {
  const t = useTranslations("budget.dialogs.edit");
  const toast = useToast();
  const mutation = useUpdateBudgetMutation(budget.id);

  const [name, setName] = useState(budget.name);

  function handleClose() {
    setName(budget.name);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onSuccess?.();
          handleClose();
        },
        onError: () => toast.error(t("error")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("currency")}</Label>
            <Input value={budget.currency} readOnly disabled className="cursor-not-allowed opacity-60" />
          </div>

          <div className="space-y-1.5">
            <Label>{t("type")}</Label>
            <Input value={budget.type} readOnly disabled className="cursor-not-allowed opacity-60" />
          </div>

          {mutation.isError ? (
            <p className="text-xs text-destructive">{t("error")}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
