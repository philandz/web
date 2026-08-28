"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Coins, LineChart, Wallet, BarChart3, Bitcoin } from "lucide-react";

import {
  usePortfolioAssetsQuery,
  usePortfolioSummaryQuery,
} from "@/modules/portfolio/hooks";
import type {
  AssetSource,
  PortfolioAsset,
  PortfolioSummary,
  ValuatedAsset,
} from "@/services/portfolio-service";

import { SavingsAccountCard } from "./savings-account-card";
import { FixedDepositCard } from "./fixed-deposit-card";
import { GoldLotCard } from "./gold-lot-card";
import { StockLotCard } from "./stock-lot-card";
import { EtfLotCard } from "./etf-lot-card";
import { CryptoLotCard } from "./crypto-lot-card";

interface PortfolioViewProps {
  budgetId: string;
  source?: AssetSource;
}

/**
 * Typed Asset Portfolio view. Renders summary KPIs, allocation hints,
 * and one card per asset class. Replaces the legacy InvestBudgetView
 * for Investment Budgets.
 */
export function PortfolioView({ budgetId, source }: PortfolioViewProps) {
  const summary = usePortfolioSummaryQuery(budgetId, source);
  const assets = usePortfolioAssetsQuery(budgetId, source);

  if (summary.isLoading || assets.isLoading) {
    return <PortfolioSkeleton />;
  }

  const summaryData = summary.data;
  const assetsData = assets.data?.assets ?? [];

  return (
    <div className="space-y-6">
      <PortfolioSummaryCard summary={summaryData} />
      {assetsData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assetsData.map((v) => (
            <AssetCardRouter key={assetKey(v)} valuated={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function assetKey(v: ValuatedAsset): string {
  return v.asset?.base?.id ?? `${v.asset?.assetClass ?? "unknown"}:${v.currentValue}`;
}

function AssetCardRouter({ valuated }: { valuated: ValuatedAsset }) {
  const asset = valuated.asset;
  if (!asset) return null;
  switch (asset.assetClass) {
    case "savings_account":
      return asset.savingsAccount ? (
        <SavingsAccountCard asset={asset} sub={asset.savingsAccount} v={valuated} />
      ) : null;
    case "fixed_deposit":
      return asset.fixedDeposit ? (
        <FixedDepositCard asset={asset} sub={asset.fixedDeposit} v={valuated} />
      ) : null;
    case "gold_lot":
      return asset.goldLot ? (
        <GoldLotCard asset={asset} sub={asset.goldLot} v={valuated} />
      ) : null;
    case "stock_lot":
      return asset.stockLot ? (
        <StockLotCard asset={asset} sub={asset.stockLot} v={valuated} />
      ) : null;
    case "etf_lot":
      return asset.etfLot ? (
        <EtfLotCard asset={asset} sub={asset.etfLot} v={valuated} />
      ) : null;
    case "crypto_lot":
      return asset.cryptoLot ? (
        <CryptoLotCard asset={asset} sub={asset.cryptoLot} v={valuated} />
      ) : null;
    default:
      return null;
  }
}

/**
 * Compact summary card used in tight grids (e.g. recent-activity widget).
 * Renders the asset-class icon, label, and current value.
 */
export function AssetSummaryCard({ valuated }: { valuated: ValuatedAsset }) {
  const asset = valuated.asset;
  if (!asset) return null;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <AssetClassIcon assetClass={asset.assetClass} className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{asset.displayName}</p>
          <p className="text-xs text-muted-foreground">{formatMinor(valuated.currentValue)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary | undefined;
}

function PortfolioSummaryCard({ summary }: PortfolioSummaryCardProps) {
  const totalValue = summary?.totalCurrentValue ?? 0;
  const totalCost = summary?.totalOpenCostBasis ?? 0;
  const realized = summary?.totalRealizedPnl ?? 0;
  const unrealized = summary?.totalUnrealizedPnl ?? 0;
  const totalPnl = realized + unrealized;
  const totalReturnPct = summary?.totalReturnPct ?? 0;
  const isLegacy = summary?.source === "legacy";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Portfolio summary
        </CardTitle>
        {isLegacy && <Badge variant="outline">backfilled</Badge>}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Total value" value={totalValue} currency={summary?.currency} />
          <Kpi label="Cost basis" value={totalCost} currency={summary?.currency} />
          <Kpi label="Realized P&L" value={realized} currency={summary?.currency} />
          <Kpi label="Unrealized P&L" value={unrealized} currency={summary?.currency} />
          <Kpi label="Return" value={totalPnl} pct={totalReturnPct} currency={summary?.currency} />
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiProps {
  label: string;
  value: number;
  pct?: number;
  currency?: string;
}

function Kpi({ label, value, pct, currency }: KpiProps) {
  const formatted = formatMoney(value, currency);
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatted}</p>
      {typeof pct === "number" && (
        <p
          className={
            "mt-0.5 text-xs " +
            (pct > 0
              ? "text-emerald-600"
              : pct < 0
                ? "text-rose-600"
                : "text-muted-foreground")
          }
        >
          {pct.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

function formatMoney(minor: number, currency?: string): string {
  if (currency && currency.length > 0) {
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(minor);
    } catch {
      // fall through
    }
  }
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(minor);
}

function formatMinor(minor: number | undefined): string {
  if (typeof minor !== "number") return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(minor);
}

// ---------------------------------------------------------------------------
// Empty state and skeleton
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <PiggyBank className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No assets yet. Add a savings account, fixed deposit, gold lot, or stock lot to start.
        </p>
      </CardContent>
    </Card>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset-class icons
// ---------------------------------------------------------------------------

export const assetClassIcon = {
  savings_account: Wallet,
  fixed_deposit: PiggyBank,
  gold_lot: Coins,
  stock_lot: LineChart,
  etf_lot: BarChart3,
  crypto_lot: Bitcoin,
} as const;

export function AssetClassIcon({
  assetClass,
  className,
}: {
  assetClass: PortfolioAsset["assetClass"];
  className?: string;
}) {
  const key = assetClass as keyof typeof assetClassIcon;
  const Icon = assetClassIcon[key] ?? Wallet;
  return <Icon className={className ?? "h-4 w-4"} />;
}