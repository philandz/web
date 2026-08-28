"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PortfolioAsset,
  PortfolioGoldLot,
  ValuatedAsset,
} from "@/services/portfolio-service";

interface GoldLotCardProps {
  asset: PortfolioAsset;
  sub: PortfolioGoldLot;
  v: ValuatedAsset;
}

export function GoldLotCard({ asset, sub, v }: GoldLotCardProps) {
  const t = useTranslations("budget.portfolio");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4" /> {asset.displayName}
        </CardTitle>
        <StatusBadge status={asset.status} freshness={v.freshness} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label={t("goldProvider")} value={sub.provider || "—"} />
        <Row label={t("goldType")} value={sub.goldType || "—"} />
        <Row label={t("goldPurity")} value={t(`gold_${sub.purity.toLowerCase()}` as never) || sub.purity} />
        <Row label={t("goldForm")} value={t(`gold_${sub.form.toLowerCase()}` as never) || sub.form} />
        <Row label={t("goldQuantityGrams")} value={sub.quantityGrams || "0"} />
        <Row
          label={t("goldOriginal")}
          value={`${sub.quantityOriginal} ${t(`goldUnit_${sub.unitOriginal.toLowerCase()}` as never) || sub.unitOriginal}`}
        />
        <Row label={t("goldCostBasis")} value={formatMinor(sub.purchaseCost)} />
        <Row label={t("goldPurchaseDate")} value={formatDate(sub.purchaseDate)} />
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