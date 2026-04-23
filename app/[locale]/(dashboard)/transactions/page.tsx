"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TransactionsTab } from "@/components/philand/transactions-tab";
import { useBudgetsQuery } from "@/modules/budget/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { SelectNative } from "@/components/ui/select";

export default function TransactionsPage() {
  const t = useTranslations("budget.globalTransactions");
  const tenant = useTenantContext();
  const orgId = tenant.selectedOrgId ?? "";

  const { data: budgets = [] } = useBudgetsQuery({ orgId });
  const [budgetId, setBudgetId] = useState<string>("");

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {budgets.length > 0 && (
          <SelectNative
            value={budgetId}
            onValueChange={setBudgetId}
            className="w-48 shrink-0"
          >
            <option value="">{t("allBudgets")}</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </SelectNative>
        )}
      </div>

      <TransactionsTab
        budgetId={budgetId}
        budgetIds={budgets.map((b) => b.id)}
      />
    </div>
  );
}
