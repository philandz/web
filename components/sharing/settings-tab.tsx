"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { budgetService, type Budget } from "@/services/budget-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useToast } from "@/components/state/toast-provider";
import { PrivateBudgetToggle } from "./private-budget-toggle";
import { BudgetDeleteDialog } from "@/components/philand/budget-delete-dialog";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSettlementQuery, useSharingStatusMutation } from "@/modules/sharing/hooks";

type SettingsTabProps = {
  budgetId: string;
  initialBudget?: Budget;
};

export function SettingsTab({ budgetId, initialBudget }: SettingsTabProps) {
  const t = useTranslations("sharing");
  const toast = useToast();
  const { orgRole } = useTenantContext();
  const isOwner = orgRole === "owner";

  const [budget, setBudget] = useState<Budget | null>(initialBudget ?? null);
  const [loading, setLoading] = useState(!initialBudget);

  const [name, setName] = useState(initialBudget?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const statusMutation = useSharingStatusMutation(budgetId);
  const { data: settlement } = useSettlementQuery(budgetId);
  const hasUnsettled = (settlement?.transfers ?? []).length > 0;
  const isArchived = budget?.status === "archived";
  const canManage = budget?.myRole === "owner" || budget?.myRole === "manager";
  const canDelete = isOwner || budget?.myRole === "owner";

  function changeStatus(action: "archive" | "reopen") {
    statusMutation.mutate(action, {
      onSuccess: () => {
        setBudget((b) => (b ? { ...b, status: action === "archive" ? "archived" : "active" } : b));
        toast.success(t(action === "archive" ? "archive.done" : "archive.reopened"));
      },
      onError: () => toast.error(t("errors.errorGeneric")),
    });
  }

  // Fetch budget if not provided
  useState(() => {
    if (initialBudget) return;
    budgetService.getBudget(budgetId).then((b) => {
      setBudget(b);
      setName(b.name);
      setLoading(false);
    }).catch(() => setLoading(false));
  });

  async function handleSaveName() {
    if (!name.trim() || name === budget?.name) return;
    setSavingName(true);
    try {
      const updated = await budgetService.updateBudget(budgetId, { name: name.trim() });
      setBudget(updated);
      toast.success(t("settings.nameSaved"));
    } catch {
      toast.error(t("errors.errorGeneric"));
    } finally {
      setSavingName(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Name editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t("settings.budgetName")}
        </label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            disabled={savingName}
          />
          <Button
            onClick={handleSaveName}
            disabled={savingName || !name.trim() || name === budget?.name}
            size="sm"
          >
            {savingName ? t("form.submitting") : t("settings.save")}
          </Button>
        </div>
      </div>

      {/* Currency display */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t("settings.currency")}
        </label>
        <p className="text-sm text-muted-foreground">
          {budget?.currency ?? "—"}
        </p>
      </div>

      {/* Private toggle */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <PrivateBudgetToggle
          budgetId={budgetId}
          initial={budget?.is_private ?? false}
        />
      </div>

      {/* Finish & settle / reopen — owner or manager */}
      {canManage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isArchived ? t("archive.reopen") : t("archive.finish")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isArchived ? t("archive.reopenDesc") : t("archive.finishDesc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={statusMutation.isPending}
            onClick={() => (isArchived ? changeStatus("reopen") : setConfirmArchive(true))}
          >
            {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={t("archive.finish")}
        description={hasUnsettled ? t("archive.unsettledWarning") : t("archive.finishConfirm")}
        confirmLabel={t("form.confirm")}
        cancelLabel={t("form.cancel")}
        onConfirm={() => {
          setConfirmArchive(false);
          changeStatus("archive");
        }}
      />

      {/* Delete budget — owner only; the backend cascades to expenses, legs, participants and links */}
      {canDelete && budget && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium text-destructive">
              {t("settings.deleteBudget")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.confirmDelete")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            aria-label={t("settings.deleteBudget")}
            title={t("settings.deleteBudget")}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      {budget ? (
        <BudgetDeleteDialog
          open={deleteOpen}
          budgetId={budgetId}
          budgetName={budget.name}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => router.push(routes.budgets)}
        />
      ) : null}
    </div>
  );
}
