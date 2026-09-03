"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PortfolioAsset,
  PortfolioFixedDeposit,
  ValuatedAsset,
} from "@/services/portfolio-service";

interface FixedDepositCardProps {
  asset: PortfolioAsset;
  sub: PortfolioFixedDeposit;
  v: ValuatedAsset;
}

export function FixedDepositCard({ asset, sub, v }: FixedDepositCardProps) {
  const t = useTranslations("budget.portfolio");
  const accrued = v.accruedInterest ?? 0;
  const current = v.currentValue ?? 0;
  const daysToMaturity = computeDaysToMaturity(sub.maturityDate);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4" /> {asset.displayName}
        </CardTitle>
        <StatusBadge status={asset.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label={t("savingsProvider")} value={sub.provider || "—"} />
        <Row label={t("fixedProduct")} value={sub.productName || "—"} />
        <Row label={t("fixedPrincipal")} value={formatMinor(sub.principal)} />
        <Row label={t("savingsRate")} value={formatRate(sub.annualRate)} />
        <Row label={t("fixedMethod")} value={t(`savings_${sub.interestMethod.toLowerCase()}` as never) || sub.interestMethod} />
        <Row label={t("fixedPayout")} value={t(`savings_${sub.payoutType.toLowerCase()}` as never) || sub.payoutType} />
        <Row label={t("fixedDepositDate")} value={formatDate(sub.depositDate)} />
        <Row label={t("fixedMaturityDate")} value={formatDate(sub.maturityDate)} />
        {daysToMaturity !== null && (
          <Row label={t("fixedDaysToMaturity")} value={String(daysToMaturity)} />
        )}
        <Row label={t("fixedAutoRenewal")} value={t(`fixed_${sub.autoRenewalPolicy.toLowerCase()}` as never) || sub.autoRenewalPolicy} />
        <div className="mt-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">{t("fixedAccrued")}</p>
          <p className="text-lg font-semibold">{formatMinor(accrued)}</p>
          <p className="text-xs text-muted-foreground">
            {t("fixedMaturityValue")} {formatMinor(current)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function computeDaysToMaturity(maturityEpoch: number | undefined): number | null {
  if (!maturityEpoch) return null;
  const now = Math.floor(Date.now() / 1000);
  const diff = maturityEpoch - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PortfolioAsset["status"] }) {
  const t = useTranslations("budget.portfolio");
  const variant = status === "active" ? "default" : "outline";
  const label = t(`status_${camel(status)}` as never) || status;
  return <Badge variant={variant as "default" | "outline"}>{label}</Badge>;
}

function camel(s: string): string {
  return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function formatMinor(minor: number | undefined): string {
  if (typeof minor !== "number") return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(minor);
}

function formatRate(rate: number | undefined): string {
  if (typeof rate !== "number") return "—";
  return `${(rate * 100).toFixed(2)}% p.a.`;
}

function formatDate(epochSeconds: number | undefined): string {
  if (!epochSeconds) return "—";
  try {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}