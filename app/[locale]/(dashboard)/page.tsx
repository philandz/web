"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { OverviewTab } from "@/components/philand/overview-tab";
import { EmptyState } from "@/components/state/empty-state";
import { SelectNative } from "@/components/ui/select";
import { useBudgetsQuery } from "@/modules/budget/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useRouter } from "@/i18n/navigation";

export default function DashboardPage() {
  const t = useTranslations("dashboard.dashboard");
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common.states");
  const tenant = useTenantContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = tenant.selectedOrgId ?? "";
  const { data: pagedBudgets, isLoading } = useBudgetsQuery({ orgId, page: 1, pageSize: 50 });
  const budgets = pagedBudgets?.items ?? [];

  const selectedBudgetId = searchParams.get("budget") ?? "";
  const selectedBudget = useMemo(() => {
    if (!budgets.length) return null;
    return budgets.find((b) => b.id === selectedBudgetId) ?? budgets[0];
  }, [budgets, selectedBudgetId]);

  // Keep the URL canonical when budgets load.
  useEffect(() => {
    if (!selectedBudget) return;
    if (selectedBudgetId === selectedBudget.id) return;
    router.replace(`/?budget=${encodeURIComponent(selectedBudget.id)}`);
  }, [router, selectedBudget, selectedBudgetId]);

  if (!orgId) {
    return (
      <EmptyState
        title={tShell("noOrganization")}
        description={t("subtitle")}
      />
    );
  }

  return (
    <div className="animate-fade-in-up space-y-5">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<Wallet className="h-5 w-5" />}
        actions={budgets.length > 0 ? (
          <SelectNative
            value={selectedBudget?.id ?? ""}
            onValueChange={(id) => router.replace(`/?budget=${encodeURIComponent(id)}`)}
            className="w-full sm:w-72"
          >
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </SelectNative>
        ) : null}
      />

      {isLoading ? (
        <div className="surface-panel rounded-2xl p-6">
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        </div>
      ) : selectedBudget ? (
        <OverviewTab budget={selectedBudget} />
      ) : (
        <EmptyState title={tShell("budgets")} description="No budgets found in this organization." />
      )}
    </div>
  );
}
