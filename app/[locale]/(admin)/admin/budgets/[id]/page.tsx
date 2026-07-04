"use client";

import { useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";

import { BudgetDetailHeader } from "@/components/philand/budget-detail-header";
import { InvestBudgetView } from "@/components/philand/invest-budget-view";
import { BudgetDetailMockup as BudgetDetailWithTabs } from "@/components/philand/budget-detail-with-tabs";
import { PageErrorState } from "@/components/state/page-error-state";
import { PageLoadingState } from "@/components/state/page-loading-state";
import { useBudgetMembersQuery, useBudgetQuery } from "@/modules/budget/hooks";

// ---------------------------------------------------------------------------
// Tab config — mirror of dashboard/budgets/[id]/page.tsx so URL deep-links
// from the admin list land on the same tab the user expected.
// ---------------------------------------------------------------------------

const ALL_TABS = ["overview", "transactions", "categories", "members", "settings"] as const;
type TabName = (typeof ALL_TABS)[number];

function isValidTab(v: string | null): v is TabName {
  return ALL_TABS.includes(v as TabName);
}

// ---------------------------------------------------------------------------
// Page — entry point from /admin/budgets row click
//
// Renders the same tabs + header as the dashboard budget detail page. With
// the gateway propagating x-user-type (see fix(gateway)), super admin can
// read and write any budget through this route even without being an
// explicit member of the org.
// ---------------------------------------------------------------------------

export default function AdminBudgetDetailPage() {
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
      router.replace(`${routes.adminBudgetDetail(budgetId)}?${sp.toString()}`);
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
              onClick={() => router.push(routes.adminBudgets)}
            >
              {t("backToBudgets")}
            </button>
          }
        />
      </main>
    );
  }

  // Invest budgets render the full invest view (no tabs).
  if (budget.type === "invest") {
    return (
      <div className="animate-fade-in-up space-y-4">
        <BudgetDetailHeader budget={budget} members={members} />
        <InvestBudgetView budgetId={budgetId} />
      </div>
    );
  }

  // Sharing budgets bounce to the regular sharing detail route — same UX
  // as the dashboard detail page.
  if (budget.type === "sharing") {
    if (typeof window !== "undefined") {
      router.replace(routes.sharingDetail(budgetId));
    }
    return (
      <main className="container py-8">
        <PageLoadingState message={t("loading")} />
      </main>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <BudgetDetailWithTabs
        budget={budget}
        activeTab={activeTab}
        onTab={(tab) => handleTabChange(tab)}
      />
    </div>
  );
}