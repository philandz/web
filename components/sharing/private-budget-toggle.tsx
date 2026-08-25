"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { budgetService } from "@/services/budget-service";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useToast } from "@/components/state/toast-provider";

type PrivateBudgetToggleProps = {
  budgetId: string;
  initial: boolean;
};

export function PrivateBudgetToggle({ budgetId, initial }: PrivateBudgetToggleProps) {
  const t = useTranslations("sharing");
  const toast = useToast();
  const { orgRole } = useTenantContext();
  const isOwner = orgRole === "owner";

  const [isPrivate, setIsPrivate] = useState(initial);
  const [isPending, setIsPending] = useState(false);

  if (!isOwner) return null;

  async function handleToggle() {
    const next = !isPrivate;
    setIsPrivate(next);
    setIsPending(true);
    try {
      await budgetService.updateBudget(budgetId, { is_private: next });
    } catch {
      // Revert on error
      setIsPrivate(!next);
      toast.error(t("errors.errorGeneric"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {t("settings.private")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("settings.privateDescription")}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        aria-label={t("settings.private")}
        onClick={handleToggle}
        disabled={isPending}
        className={
          `relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ` +
          (isPrivate
            ? "bg-amber-500"
            : "bg-muted-foreground/30")
        }
      >
        <span
          className={
            `inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ` +
            (isPrivate ? "translate-x-4" : "translate-x-0.5")
          }
        />
      </button>
    </label>
  );
}
