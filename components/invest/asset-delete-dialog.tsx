"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/state/toast-provider";
import { useDeleteAssetMutation } from "@/modules/invest/hooks";
import type { InvestAsset } from "@/services/invest-service";

interface AssetDeleteDialogProps {
  asset: InvestAsset;
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmt(amount: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function AssetDeleteDialog({ asset, budgetId, open, onOpenChange }: AssetDeleteDialogProps) {
  const t = useTranslations("budget.invest");
  const toast = useToast();
  const deleteMutation = useDeleteAssetMutation(budgetId);

  const hasPnl = asset.unrealizedPnl !== 0;
  const isPositive = asset.unrealizedPnl >= 0;

  function handleConfirm() {
    deleteMutation.mutate(asset.id, {
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
        onOpenChange(false);
      },
      onError: () => toast.error(t("deleteError")),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {t("deleteTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {hasPnl ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("deleteWarning", {
                  pnl: fmt(Math.abs(asset.unrealizedPnl)),
                  sign: isPositive ? "+" : "-",
                })}
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm font-medium text-destructive">
                  {t("deletePnlLoss")}: {isPositive ? "+" : "-"}
                  {fmt(Math.abs(asset.unrealizedPnl))}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={deleteMutation.isPending}
            onClick={handleConfirm}
          >
            {deleteMutation.isPending ? t("deleting") : t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
