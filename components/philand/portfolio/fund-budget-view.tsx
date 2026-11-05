"use client";

import { useTranslations } from "next-intl";
import { BudgetDetailHeader } from "@/components/philand/budget-detail-header";
import { MembersTab } from "@/components/philand/members-tab";
import { SettingsTab } from "@/components/philand/settings-tab";
import { TransactionsTab } from "@/components/philand/transactions-tab";
import { cn } from "@/lib/utils";
import type { Budget, BudgetMember } from "@/services/budget-service";

import { FundPanel } from "./fund-panel";
import { PortfolioView } from "./portfolio-view";

export const FUND_TABS = ["fund", "history", "members", "settings"] as const;
export type FundTab = (typeof FUND_TABS)[number];

export function toFundTab(tab: string | null | undefined): FundTab {
  return FUND_TABS.includes(tab as FundTab) ? (tab as FundTab) : "fund";
}

interface FundBudgetViewProps {
  budget: Budget;
  members: BudgetMember[];
  activeTab: FundTab;
  onTab: (tab: FundTab) => void;
}

/**
 * A Saving budget once it is a fund (plan R2): value + cash pocket + investments,
 * the read-only income/expense history from before the fund model, members, settings.
 */
export function FundBudgetView({ budget, members, activeTab, onTab }: FundBudgetViewProps) {
  const t = useTranslations("budget.fund.tabs");
  const canEdit = ["owner", "manager", "contributor"].includes(budget.myRole ?? "");

  return (
    <div className="animate-fade-in-up space-y-4">
      <BudgetDetailHeader budget={budget} members={members} />

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border" data-testid="fund-tabs">
        {FUND_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === activeTab}
            onClick={() => onTab(tab)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3.5 py-2 text-[13px] transition-colors",
              tab === activeTab
                ? "border-primary font-bold text-primary"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {activeTab === "fund" ? (
        <>
          <FundPanel budgetId={budget.id} canEdit={canEdit} />
          <PortfolioView budgetId={budget.id} hideSummary />
        </>
      ) : null}
      {activeTab === "history" ? (
        <div className="space-y-3" data-testid="fund-legacy-history">
          <p className="text-sm text-muted-foreground">{t("historyHint")}</p>
          <TransactionsTab
            budgetId={budget.id}
            currency={budget.currency}
            readOnly
            persistFiltersInUrl={false}
          />
        </div>
      ) : null}
      {activeTab === "members" ? (
        <MembersTab budgetId={budget.id} orgId={budget.orgId} myRole={budget.myRole} />
      ) : null}
      {activeTab === "settings" ? <SettingsTab budget={budget} myRole={budget.myRole} /> : null}
    </div>
  );
}
