"use client";

import { useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";

import { BudgetDetailHeader } from "@/components/philand/budget-detail-header";
import { InvestBudgetView } from "@/components/philand/invest-budget-view";
import { BudgetDetailMockup } from "@/components/philand/budget-detail-mockup";
import { PageErrorState } from "@/components/state/page-error-state";
import { PageLoadingState } from "@/components/state/page-loading-state";
import { useBudgetMembersQuery, useBudgetQuery } from "@/modules/budget/hooks";

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const ALL_TABS = ["overview", "transactions", "categories", "members", "settings"] as const;
type TabName = (typeof ALL_TABS)[number];

function isValidTab(v: string | null): v is TabName {
  return ALL_TABS.includes(v as TabName);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BudgetDetailPage() {
  const t = useTranslations("budget.detail");
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const budgetId = params.id;
  const rawTab = searchParams.get("tab");
  const activeTab: TabName = isValidTab(rawTab) ? rawTab : "overview";

  const { data: budget, isLoading, isError } = useBudgetQuery(budgetId);
  const { data: members = [] } = useBudgetMembersQuery(budgetId);

  const handleTabChange = useCallback(
    (tab: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", tab);
      router.replace(`${routes.budgetDetail(budgetId)}?${sp.toString()}`);
    },
    [router, budgetId, searchParams],
  );

  if (isLoading) {
    return (
      <main className="container py-8">
        <PageLoadingState message={t("loading")} />
      </main>
    );
  }

  if (isError || !budget) {
    return (
      <main className="container py-8">
        <PageErrorState
          message={t("notFound")}
          action={
            <button
              className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
              onClick={() => router.push(routes.budgets)}
            >
              {t("backToBudgets")}
            </button>
          }
        />
      </main>
    );
  }

  // Invest budgets get their own full view (no tabs)
  if (budget.type === "invest") {
    return (
      <div className="animate-fade-in-up space-y-4">
        <BudgetDetailHeader
          budget={budget}
          members={members}
        />
        <InvestBudgetView budgetId={budgetId} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <BudgetDetailMockup
        budget={budget}
        activeTab={activeTab}
        onTab={(tab) => handleTabChange(tab)}
      />
    </div>
  );
}
