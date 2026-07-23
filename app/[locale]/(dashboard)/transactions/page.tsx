"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { TransactionsTab } from "@/components/philand/transactions-tab";
import { useBudgetsQuery } from "@/modules/budget/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { SelectNative } from "@/components/ui/select";

export default function TransactionsPage() {
  const t = useTranslations("budget.globalTransactions");
  const tenant = useTenantContext();
  const orgId = tenant.selectedOrgId ?? "";

  const { data: pagedBudgets } = useBudgetsQuery({ orgId });
  const budgets = pagedBudgets?.items ?? [];
  const [budgetId, setBudgetId] = useState<string>("");

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<ArrowLeftRight className="h-5 w-5" />}
        actions={budgets.length > 0 ? (
          <SelectNative
            value={budgetId}
            onValueChange={setBudgetId}
            className="w-full sm:w-56"
          >
            <option value="">{t("allBudgets")}</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </SelectNative>
        ) : null}
      />

      <TransactionsTab
        budgetId={budgetId}
        budgetIds={budgets.map((b) => b.id)}
      />
    </div>
  );
}
