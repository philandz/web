"use client";

import { useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";

import { BudgetDetailHeader } from "@/components/philand/budget-detail-header";
import { CategoriesTab } from "@/components/philand/categories-tab";
import { InvestBudgetView } from "@/components/philand/invest-budget-view";
import { MembersTab } from "@/components/philand/members-tab";
import { OverviewTab } from "@/components/philand/overview-tab";
import { SettingsTab } from "@/components/philand/settings-tab";
import { TransactionsTab } from "@/components/philand/transactions-tab";
import { QuickEntryButton } from "@/components/philand/quick-entry-button";
import { PageErrorState } from "@/components/state/page-error-state";
import { PageLoadingState } from "@/components/state/page-loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useBudgetQuery, useBudgetMembersQuery } from "@/modules/budget/hooks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const PRIMARY_TABS = ["overview", "transactions", "categories", "members"] as const;
const ALL_TABS = [...PRIMARY_TABS, "settings"] as const;
type TabName = (typeof ALL_TABS)[number];

function isValidTab(v: string | null): v is TabName {
  return ALL_TABS.includes(v as TabName);
}

// Tab label key map — avoids dynamic string construction
const TAB_LABEL_KEY: Record<typeof PRIMARY_TABS[number], "tabOverview" | "tabTransactions" | "tabCategories" | "tabMembers"> = {
  overview:     "tabOverview",
  transactions: "tabTransactions",
  categories:   "tabCategories",
  members:      "tabMembers",
};

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
      router.replace(`${routes.budgetDetail(budgetId)}?tab=${tab}`);
    },
    [router, budgetId],
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
    <div className="animate-fade-in-up space-y-4">
      <BudgetDetailHeader
        budget={budget}
        members={members}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* ── Sticky tab bar ── */}
        <div className={cn(
          "sticky top-0 z-20",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "border-b border-border/60",
        )}>
          <div className="flex items-center">
            {/* Primary tab triggers */}
            <TabsList className="no-scrollbar h-auto flex-1 justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
              {PRIMARY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    // Reset radix defaults
                    "relative rounded-none bg-transparent shadow-none",
                    // Sizing & text
                    "px-4 py-3 text-sm font-medium",
                    // Inactive state
                    "text-muted-foreground hover:text-foreground",
                    // Active state (driven by data-[state] AND our manual activeTab check)
                    "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
                    // Active underline indicator
                    "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:transition-opacity",
                    activeTab === tab
                      ? "after:bg-primary after:opacity-100"
                      : "after:opacity-0",
                  )}
                >
                  {t(TAB_LABEL_KEY[tab])}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Settings — separated by a rule */}
            <div className="flex items-center self-stretch border-l border-border/50 pl-2 ml-1">
              <Button
                variant={activeTab === "settings" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleTabChange("settings")}
                title={t("tabSettings")}
              >
                <Settings2 className={cn(
                  "h-4 w-4 transition-colors",
                  activeTab === "settings" ? "text-foreground" : "text-muted-foreground"
                )} />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab content panels */}
        <TabsContent value="overview" className="mt-5 focus-visible:outline-none">
          <OverviewTab budget={budget} />
        </TabsContent>
        <TabsContent value="transactions" className="mt-5 focus-visible:outline-none">
          <TransactionsTab
            budgetId={budgetId}
            currency={budget.currency}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-5 focus-visible:outline-none">
          <CategoriesTab
            budgetId={budgetId}
            currency={budget.currency}
          />
        </TabsContent>
        <TabsContent value="members" className="mt-5 focus-visible:outline-none">
          <MembersTab
            budgetId={budgetId}
            myRole={budget.myRole}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-5 focus-visible:outline-none">
          <SettingsTab budget={budget} myRole={budget.myRole} />
        </TabsContent>
      </Tabs>

      {/* Quick entry floating button (mobile) + N shortcut (desktop) */}
      <QuickEntryButton budgetId={budgetId} currency={budget.currency} />
    </div>
  );
}
