"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { useUpdateAssetMutation } from "@/modules/invest/hooks";
import type { AssetType, GoldUnit, InvestAsset, StockExchange } from "@/services/invest-service";
import { cn } from "@/lib/utils";

interface AssetEditDialogProps {
  asset: InvestAsset;
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetEditDialog({ asset, budgetId, open, onOpenChange }: AssetEditDialogProps) {
  const t = useTranslations("budget.invest");
  const toast = useToast();
  const updateMutation = useUpdateAssetMutation(budgetId, asset.id);

  const [assetType] = useState<AssetType>(asset.assetType);
  const [name, setName] = useState(asset.name);
  const [principal, setPrincipal] = useState(asset.principal ? String(asset.principal) : "");
  const [annualRate, setAnnualRate] = useState(asset.annualRate ? String(asset.annualRate * 100) : "");
  const [interestType, setInterestType] = useState(asset.interestType ?? "simple");
  const [startDate, setStartDate] = useState(asset.startDate ?? "");
  const [maturityDate, setMaturityDate] = useState(asset.maturityDate ?? "");
  const [bankName, setBankName] = useState(asset.bankName ?? "");
  const [quantity, setQuantity] = useState(asset.quantity ? String(asset.quantity) : "");
  const [unit, setUnit] = useState<GoldUnit>(asset.unit ?? "luong");
  const [costBasisPerUnit, setCostBasisPerUnit] = useState(asset.costBasisPerUnit ? String(asset.costBasisPerUnit) : "");
  const [ticker, setTicker] = useState(asset.ticker ?? "");
  const [exchange, setExchange] = useState<StockExchange>(asset.exchange ?? "HOSE");
  const [avgCostPerShare, setAvgCostPerShare] = useState(asset.avgCostPerShare ? String(asset.avgCostPerShare) : "");
  const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate ?? "");

  function handleClose() {
    // Reset form to original values
    setName(asset.name);
    setPrincipal(asset.principal ? String(asset.principal) : "");
    setAnnualRate(asset.annualRate ? String(asset.annualRate * 100) : "");
    setInterestType(asset.interestType ?? "simple");
    setStartDate(asset.startDate ?? "");
    setMaturityDate(asset.maturityDate ?? "");
    setBankName(asset.bankName ?? "");
    setQuantity(asset.quantity ? String(asset.quantity) : "");
    setUnit(asset.unit ?? "luong");
    setCostBasisPerUnit(asset.costBasisPerUnit ? String(asset.costBasisPerUnit) : "");
    setTicker(asset.ticker ?? "");
    setExchange(asset.exchange ?? "HOSE");
    setAvgCostPerShare(asset.avgCostPerShare ? String(asset.avgCostPerShare) : "");
    setPurchaseDate(asset.purchaseDate ?? "");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const base = { assetType, name: name.trim(), status: "active" as const, currentValue: 0, costBasis: 0, unrealizedPnl: 0, pnlPct: 0 };
    const payload =
      assetType === "savings_deposit"
        ? { ...base, principal: parseFloat(principal) || undefined, annualRate: annualRate ? parseFloat(annualRate) / 100 : undefined, interestType: interestType as "simple" | "compound", startDate: startDate || undefined, maturityDate: maturityDate || undefined, bankName: bankName || undefined }
        : assetType === "gold"
        ? { ...base, quantity: parseFloat(quantity) || undefined, unit: unit || undefined, costBasisPerUnit: parseFloat(costBasisPerUnit) || undefined, purchaseDate: purchaseDate || undefined }
        : { ...base, ticker: ticker.toUpperCase() || undefined, exchange: exchange || undefined, quantity: parseFloat(quantity) || undefined, avgCostPerShare: parseFloat(avgCostPerShare) || undefined, purchaseDate: purchaseDate || undefined };

    updateMutation.mutate(payload, {
      onSuccess: () => { toast.success(t("updateSuccess")); handleClose(); },
      onError: () => toast.error(t("updateError")),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Asset type label - read-only for edit */}
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm font-medium text-foreground capitalize">
            {asset.assetType.replace("_", " ")}
          </div>

          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </div>

          {assetType === "savings_deposit" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("principal")}</Label><Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="50000000" /></div>
                <div className="space-y-1.5"><Label>{t("annualRate")} (%)</Label><Input type="number" step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="5.2" /></div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("interestType")}</Label>
                <SelectNative
                  value={interestType}
                  onValueChange={(v) => setInterestType(v as "simple" | "compound")}
                >
                  <option value="simple">{t("simple")}</option>
                  <option value="compound">{t("compound")}</option>
                </SelectNative>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("startDate")}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t("maturityDate")}</Label><Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>{t("bankName")}</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ACB, Techcombank..." /></div>
            </>
          )}

          {assetType === "gold" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("quantity")}</Label><Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="2" /></div>
                <div className="space-y-1.5">
                  <Label>{t("unit")}</Label>
                  <SelectNative value={unit} onValueChange={(v) => setUnit(v as GoldUnit)}>
                    <option value="luong">Lượng</option>
                    <option value="chi">Chỉ</option>
                    <option value="gram">Gram</option>
                  </SelectNative>
                </div>
              </div>
              <div className="space-y-1.5"><Label>{t("costBasisUnit")}</Label><Input type="number" value={costBasisPerUnit} onChange={(e) => setCostBasisPerUnit(e.target.value)} placeholder="84000000" /></div>
              <div className="space-y-1.5"><Label>{t("purchaseDate")}</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
            </>
          )}

          {assetType === "stock" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("ticker")}</Label><Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="VNM" /></div>
                <div className="space-y-1.5">
                  <Label>{t("exchange")}</Label>
                  <SelectNative value={exchange} onValueChange={(v) => setExchange(v as StockExchange)}>
                    <option value="HOSE">HOSE</option>
                    <option value="HNX">HNX</option>
                    <option value="UPCOM">UPCOM</option>
                  </SelectNative>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("shares")}</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1000" /></div>
                <div className="space-y-1.5"><Label>{t("avgCost")}</Label><Input type="number" value={avgCostPerShare} onChange={(e) => setAvgCostPerShare(e.target.value)} placeholder="72500" /></div>
              </div>
              <div className="space-y-1.5"><Label>{t("purchaseDate")}</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
            </>
          )}

          {updateMutation.isError ? (
            <p className="text-xs text-destructive">{t("updateError")}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
