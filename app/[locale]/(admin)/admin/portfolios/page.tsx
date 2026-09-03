"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Search, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { InlineAlert } from "@/components/state/inline-alert";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link, useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { formatCurrency, useFormatLocale } from "@/lib/format";
import { useAdminBudgetsQuery, useAdminOrgsQuery } from "@/modules/admin/hooks";
import { useRefreshPortfolioMutation } from "@/modules/admin/hooks";
import type { Budget } from "@/services/budget-service";

function formatTimestamp(ts: number, locale: string): string {
  if (!ts) return "—";
  // epoch seconds vs milliseconds detection
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const date = new Date(ms);
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminPortfoliosPage() {
  const t = useTranslations("admin.portfolios");
  const locale = useFormatLocale();
  const router = useRouter();

  const { data: orgsData } = useAdminOrgsQuery({ pageSize: 100 });
  const orgs = useMemo(() => orgsData?.items ?? [], [orgsData?.items]);
  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs) m.set(o.id, o.name);
    return m;
  }, [orgs]);

  const query = useAdminBudgetsQuery({ budgetType: "invest" });

  const total = query.data?.total ?? 0;
  const budgets = query.data?.budgets ?? [];

  return (
    <div className="space-y-6">
      <StaggerItem delay={0}>
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          eyebrow={t("badge")}
          icon={<TrendingUp className="h-5 w-5" />}
          actions={
            <Badge className="bg-highlight text-slate-900">
              {t("total", { count: total })}
            </Badge>
          }
        />
      </StaggerItem>

      <StaggerItem delay={80}>
        {query.isError ? (
          <InlineAlert tone="error">{t("loadError")}</InlineAlert>
        ) : query.isLoading ? (
          <SectionLoadingState message={t("loading")} />
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <Card className="surface-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">{t("column.org")}</th>
                    <th className="px-4 py-3">{t("column.budget")}</th>
                    <th className="px-4 py-3">{t("column.value")}</th>
                    <th className="px-4 py-3">{t("column.assets")}</th>
                    <th className="px-4 py-3">{t("column.lastRefresh")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <PortfolioRow
                      key={b.id}
                      budget={b}
                      orgName={orgNameById.get(b.orgId)}
                      locale={locale}
                      onNavigate={() => router.push(routes.adminPortfolioDetail(b.id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </StaggerItem>
    </div>
  );
}

function PortfolioRow({
  budget,
  orgName,
  locale,
  onNavigate,
}: {
  budget: Budget;
  orgName: string | undefined;
  locale: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("admin.portfolios");
  const refreshMutation = useRefreshPortfolioMutation();

  return (
    <tr
      role="button"
      tabIndex={0}
      data-testid={`admin-portfolio-row-${budget.id}`}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate();
        }
      }}
      className="cursor-pointer border-b border-border/60 last:border-b-0 transition hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
    >
      <td className="px-4 py-3 text-muted-foreground">
        {orgName ?? (
          <span className="font-mono text-xs">{budget.orgId.slice(0, 8)}</span>
        )}
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        <Link
          href={routes.adminPortfolioDetail(budget.id)}
          className="text-primary hover:underline focus:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {budget.name}
        </Link>
      </td>
      <td className="px-4 py-3 tabular-nums font-mono text-xs">
        {formatCurrency(budget.currentSpend, budget.currency, locale)}
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {budget.memberCount}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatTimestamp(budget.updatedAt, locale)}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={refreshMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            refreshMutation.mutate(budget.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          title={t("refresh")}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
          />
          {refreshMutation.isPending ? t("refreshing") : t("refresh")}
        </button>
      </td>
    </tr>
  );
}
