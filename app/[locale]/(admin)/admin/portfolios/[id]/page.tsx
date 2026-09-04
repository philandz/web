"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AlertTriangle, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLoadingState } from "@/components/state/page-loading-state";
import { PageErrorState } from "@/components/state/page-error-state";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { routes } from "@/constants/routes";
import { formatCurrency, useFormatLocale } from "@/lib/format";
import { useBudgetQuery, useBudgetMembersQuery } from "@/modules/budget/hooks";
import { portfolioService, type PortfolioAsset } from "@/services/portfolio-service";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssetRow {
  assetId: string;
  displayName: string;
  assetClass: string;
  status: string;
  currentValue: number;
  costBasis: number;
  returnPct: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Asset class badge variant
// ---------------------------------------------------------------------------

function assetClassLabel(t: ReturnType<typeof useTranslations>, cls: string): string {
  return t(`assetClass.${cls}` as never, { defaultValue: cls });
}

function assetClassVariant(cls: string): "default" | "outline" | "secondary" {
  switch (cls) {
    case "savings_account": return "default";
    case "fixed_deposit": return "default";
    case "gold_lot": return "secondary";
    case "stock_lot": return "outline";
    case "etf_lot": return "outline";
    case "crypto_lot": return "secondary";
    default: return "outline";
  }
}

// ---------------------------------------------------------------------------
// Overview card
// ---------------------------------------------------------------------------

function OverviewSection({
  summary,
  budgetCurrency,
  locale,
  t,
}: {
  summary: { totalCurrentValue: number; totalOpenCostBasis: number; totalRealizedPnl: number; totalUnrealizedPnl: number; totalReturnPct: number } | null;
  budgetCurrency: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const items = [
    { label: t("overview.totalValue"), value: summary ? formatCurrency(summary.totalCurrentValue, budgetCurrency, locale) : "—" },
    { label: t("overview.openCostBasis"), value: summary ? formatCurrency(summary.totalOpenCostBasis, budgetCurrency, locale) : "—" },
    { label: t("overview.realizedPnl"), value: summary ? formatCurrency(summary.totalRealizedPnl, budgetCurrency, locale) : "—" },
    { label: t("overview.unrealizedPnl"), value: summary ? formatCurrency(summary.totalUnrealizedPnl, budgetCurrency, locale) : "—" },
    { label: t("overview.returnPct"), value: summary ? `${summary.totalReturnPct.toFixed(2)}%` : "—" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="surface-panel">
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</span>
            <span className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              item.label.includes("Pnl") && item.value !== "—" && parseFloat(item.value.replace(/[^0-9.-]/g, "")) < 0
                ? "text-red-500"
                : "text-foreground"
            )}>
              {item.value}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assets table
// ---------------------------------------------------------------------------

function AssetsTable({
  assets,
  budgetCurrency,
  locale,
  t,
}: {
  assets: AssetRow[];
  budgetCurrency: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="h-8 w-8" />}
        title={t("noAssets")}
        description={t("noAssetsDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">{t("column.asset")}</th>
            <th className="px-4 py-3">{t("column.class")}</th>
            <th className="px-4 py-3">{t("column.status")}</th>
            <th className="px-4 py-3 text-right">{t("column.currentValue")}</th>
            <th className="px-4 py-3 text-right">{t("column.costBasis")}</th>
            <th className="px-4 py-3 text-right">{t("column.returnPct")}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.assetId} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition">
              <td className="px-4 py-3 font-medium text-foreground">{asset.displayName}</td>
              <td className="px-4 py-3">
                <Badge variant={assetClassVariant(asset.assetClass)} className="capitalize">
                  {assetClassLabel(t, asset.assetClass)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">{asset.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {formatCurrency(asset.currentValue, asset.currency || budgetCurrency, locale)}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                {formatCurrency(asset.costBasis, asset.currency || budgetCurrency, locale)}
              </td>
              <td className={cn("px-4 py-3 text-right tabular-nums font-medium", asset.returnPct < 0 ? "text-red-500" : "text-green-600")}>
                {asset.returnPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts / activity log
// ---------------------------------------------------------------------------

function AlertsLog({
  activities,
  locale,
  t,
}: {
  activities: { id: string; activityType: string; actorUserId: string; occurredAt: number; payloadJson: string }[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title={t("noAlerts")}
        description={t("noAlertsDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">{t("column.when")}</th>
            <th className="px-4 py-3">{t("column.type")}</th>
            <th className="px-4 py-3">{t("column.actor")}</th>
            <th className="px-4 py-3">{t("column.details")}</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => {
            const ts = a.occurredAt < 1e12 ? a.occurredAt * 1000 : a.occurredAt;
            const date = new Date(ts);
            const timeStr = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(date);

            let details = "";
            try {
              const payload = JSON.parse(a.payloadJson);
              details = payload.note ?? payload.description ?? a.payloadJson;
            } catch {
              details = a.payloadJson;
            }

            return (
              <tr key={a.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition">
                <td className="px-4 py-3 text-muted-foreground">{timeStr}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="capitalize">{a.activityType.replace(/_/g, " ").toLowerCase()}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{a.actorUserId.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{details}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPortfolioDetailPage() {
  const t = useTranslations("admin.portfolioDetail");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useFormatLocale();
  const budgetId = params.id;

  const [showForceClose, setShowForceClose] = useState(false);
  const [forceClosing, setForceClosing] = useState(false);

  const { data: budget, isLoading: budgetLoading, isError } = useBudgetQuery(budgetId);
  const { data: members = [] } = useBudgetMembersQuery(budgetId);

  // Assets — list first page of portfolio assets
  const { data: assetsData } = useQuery({
    queryKey: ["admin-portfolio-assets", budgetId],
    queryFn: () => portfolioService.listAssets(budgetId, { page: 1, pageSize: 100 }),
    enabled: Boolean(budgetId),
  });

  // Activity log — fetch last 50 entries for this budget
  const { data: activityData } = useQuery({
    queryKey: ["admin-portfolio-activity", budgetId],
    queryFn: () => portfolioService.listActivity(budgetId, "", 50),
    enabled: Boolean(budgetId),
  });

  // Derive summary from first asset's parent summary
  const { data: summaryData } = useQuery({
    queryKey: ["admin-portfolio-summary", budgetId],
    queryFn: () => portfolioService.getSummary(budgetId),
    enabled: Boolean(budgetId),
  });

  // Extract assetId from the oneof — each asset type has its own assetId field
  const getAssetId = (asset?: PortfolioAsset): string => {
    if (!asset) return "";
    return (
      asset.savingsAccount?.assetId ??
      asset.fixedDeposit?.assetId ??
      asset.goldLot?.assetId ??
      asset.stockLot?.assetId ??
      asset.etfLot?.assetId ??
      asset.cryptoLot?.assetId ??
      ""
    );
  };

  const assetRows: AssetRow[] = (assetsData?.assets ?? []).map((va) => ({
    assetId: getAssetId(va.asset),
    displayName: va.asset?.displayName ?? getAssetId(va.asset),
    assetClass: va.asset?.assetClass ?? "",
    status: va.asset?.status ?? "",
    currentValue: va.currentValue,
    costBasis: va.openCostBasis,
    returnPct: va.returnPct,
    currency: va.asset?.currency ?? budget?.currency ?? "USD",
  }));

  const activities = (activityData?.activities ?? []).map((a) => ({
    id: a.id,
    activityType: a.activityType,
    actorUserId: a.actorUserId,
    occurredAt: a.occurredAt,
    payloadJson: a.payloadJson,
  }));

  const summary = summaryData ?? null;

  const handleForceClose = useCallback(async () => {
    setForceClosing(true);
    try {
      await budgetService.forceCloseBudget(budgetId);
      router.refresh();
    } finally {
      setForceClosing(false);
      setShowForceClose(false);
    }
  }, [budgetId, router]);

  if (budgetLoading) {
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
            <Button
              variant="outline"
              onClick={() => router.push(routes.adminPortfolios)}
            >
              {t("backToPortfolios")}
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={budget.name}
        eyebrow={budget.type}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">{budget.type}</Badge>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => setShowForceClose(true)}
            >
              {t("forceClose")}
            </Button>
          </div>
        }
      />

      {/* Overview totals */}
      <OverviewSection
        summary={summary}
        budgetCurrency={budget.currency}
        locale={locale}
        t={t}
      />

      {/* Assets table */}
      <Card className="surface-panel overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{t("assets")}</h2>
        </div>
        {assetsData === undefined ? (
          <SectionLoadingState message={t("loading")} />
        ) : (
          <AssetsTable assets={assetRows} budgetCurrency={budget.currency} locale={locale} t={t} />
        )}
      </Card>

      {/* Alerts log */}
      <Card className="surface-panel overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{t("alerts")}</h2>
        </div>
        {activityData === undefined ? (
          <SectionLoadingState message={t("loading")} />
        ) : (
          <AlertsLog activities={activities} locale={locale} t={t} />
        )}
      </Card>

      {/* Force-close confirm dialog */}
      <ConfirmDialog
        open={showForceClose}
        onOpenChange={setShowForceClose}
        title={t("forceClose")}
        description={t("confirmForceClose")}
        destructive
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleForceClose}
        loading={forceClosing}
      />
    </div>
  );
}
