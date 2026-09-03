"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

import type {
  PortfolioAsset,
  PortfolioEtfLot,
  ValuatedAsset,
} from "@/services/portfolio-service";

interface EtfLotCardProps {
  asset: PortfolioAsset;
  sub: PortfolioEtfLot;
  v: ValuatedAsset;
}

export function EtfLotCard({ asset, sub, v }: EtfLotCardProps) {
  const t = useTranslations("budget.portfolio");
  const underlyingKey = underlyingToKey(sub.underlyingIndex);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {asset.displayName}
        </CardTitle>
        <StatusBadge status={asset.status} freshness={v.freshness} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label={t("stockTicker")} value={sub.ticker || "—"} />
        <Row
          label={t("stockExchange")}
          value={t(`stock_${sub.exchange.toLowerCase()}` as never) || sub.exchange}
        />
        <Row
          label={t("etfUnderlying")}
          value={t(`etf_${underlyingKey}` as never) || sub.underlyingIndex}
        />
        <Row label={t("etfFundProvider")} value={sub.fundProvider || "—"} />
        <Row label={t("stockQuantityBought")} value={sub.quantityBought} />
        <Row label={t("stockQuantityOpen")} value={sub.quantityOpen} />
        <Row label={t("stockBuyPrice")} value={formatMinor(sub.buyPricePerUnit)} />
        <Row label={t("stockCostBasis")} value={formatMinor(sub.purchaseCost)} />
        <Row label={t("stockPurchaseDate")} value={formatDate(sub.purchaseDate)} />
        {sub.settlementDate > 0 && (
          <Row label={t("stockSettled")} value={formatDate(sub.settlementDate)} />
        )}
        <div className="mt-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">{t("goldCurrentValue")}</p>
          <p className="text-lg font-semibold">{formatMinor(v.currentValue)}</p>
          <p className="text-xs text-muted-foreground">
            {t("goldUnrealized")} {formatMinor(v.unrealizedPnl)} ({v.returnPct.toFixed(2)}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function underlyingToKey(s: string): string {
  // Maps "ETF_UNDERLYING_INDEX_VN30" to "vn30", etc.
  return s
    .replace(/^ETF_UNDERLYING_INDEX_/, "")
    .replace(/^CRYPTO_NETWORK_/, "")
    .toLowerCase();
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