"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PortfolioAsset,
  PortfolioStockLot,
  ValuatedAsset,
} from "@/services/portfolio-service";

interface StockLotCardProps {
  asset: PortfolioAsset;
  sub: PortfolioStockLot;
  v: ValuatedAsset;
}

export function StockLotCard({ asset, sub, v }: StockLotCardProps) {
  const t = useTranslations("budget.portfolio");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-4 w-4" /> {asset.displayName}
        </CardTitle>
        <StatusBadge status={asset.status} freshness={v.freshness} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label={t("stockTicker")} value={sub.ticker || "—"} />
        <Row label={t("stockExchange")} value={t(`stock_${sub.exchange.toLowerCase()}` as never) || sub.exchange} />
        <Row label={t("stockQuantityBought")} value={sub.quantityBought} />
        <Row label={t("stockQuantityOpen")} value={sub.quantityOpen} />
        <Row label={t("stockBuyPrice")} value={formatMinor(sub.buyPricePerShare)} />
        <Row label={t("stockCostBasis")} value={formatMinor(sub.purchaseCost)} />
        <Row label={t("stockPurchaseDate")} value={formatDate(sub.purchaseDate)} />
        {sub.settlementDate > 0 && (
          <Row label={t("stockSettled")} value={formatDate(sub.settlementDate)} />
        )}
        <div className="mt-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">{t("stockCurrentValue")}</p>
          <p className="text-lg font-semibold">{formatMinor(v.currentValue)}</p>
          <p className="text-xs text-muted-foreground">
            {t("stockUnrealized")} {formatMinor(v.unrealizedPnl)} ({v.returnPct.toFixed(2)}%)
          </p>
          <p className="mt-2 text-xs text-amber-600">{t("stockCorporateActionWarning")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({
  status,
  freshness,
}: {
  status: PortfolioAsset["status"];
  freshness: ValuatedAsset["freshness"];
}) {
  const t = useTranslations("budget.portfolio");
  const variant = status === "active" && freshness === "FRESH" ? "default" : "outline";
  const label =
    freshness === "STALE"
      ? t("freshnessStale")
      : freshness === "UNPRICED"
        ? t("freshnessUnpriced")
        : t(`status_${camel(status)}` as never) || status;
  return <Badge variant={variant as "default" | "outline"}>{label}</Badge>;
}

function camel(s: string): string {
  return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function formatMinor(minor: number | undefined): string {
  if (typeof minor !== "number") return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(minor);
}

function formatDate(epochSeconds: number | undefined): string {
  if (!epochSeconds) return "—";
  try {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}