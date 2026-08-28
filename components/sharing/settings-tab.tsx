"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { budgetService, type Budget } from "@/services/budget-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useToast } from "@/components/state/toast-provider";
import { PrivateBudgetToggle } from "./private-budget-toggle";

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

      {/* Delete budget — owner only, placeholder for T2.8 */}
      {isOwner && (
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
            disabled
            title={t("settings.comingSoon")}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
