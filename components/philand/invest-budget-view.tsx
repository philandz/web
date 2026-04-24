"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, Clock, Plus, RefreshCw, TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { useToast } from "@/components/state/toast-provider";
import {
  useAddPriceSnapshotMutation,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useInvestAssetsQuery,
  usePortfolioSummaryQuery,
  usePriceSnapshotsQuery,
  useUpdateAssetMutation,
} from "@/modules/invest/hooks";
import type { AssetType, GoldUnit, InvestAsset, StockExchange } from "@/services/invest-service";
import { cn } from "@/lib/utils";

function fmt(amount: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

// Portfolio summary card
function PortfolioSummaryCard({ budgetId }: { budgetId: string }) {
  const t = useTranslations("budget.invest");
  const { data } = usePortfolioSummaryQuery(budgetId);
  if (!data) return null;
  const isPositive = data.totalUnrealizedPnl >= 0;
  return (
    <Card className="surface-panel">
      <CardHeader className="pb-2">
        <p className="text-sm font-semibold text-foreground">{t("portfolioTitle")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("totalValue")}</p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{fmt(data.totalCurrentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("costBasis")}</p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{fmt(data.totalCostBasis)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("unrealizedPnl")}</p>
            <p className={cn("text-xl font-semibold tracking-tight", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
              {isPositive ? "+" : ""}{fmt(data.totalUnrealizedPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("pnlPct")}</p>
            <div className="flex items-center gap-1">
              {isPositive ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <p className={cn("text-xl font-semibold tracking-tight", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                {isPositive ? "+" : ""}{data.totalPnlPct.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Asset card
interface AssetCardProps {
  asset: InvestAsset;
  budgetId: string;
  onEdit: (a: InvestAsset) => void;
  onUpdatePrice: (a: InvestAsset) => void;
  onClick: (a: InvestAsset) => void;
}

function AssetCard({ asset, budgetId, onEdit, onUpdatePrice, onClick }: AssetCardProps) {
  const t = useTranslations("budget.invest");
  const toast = useToast();
  const deleteMutation = useDeleteAssetMutation(budgetId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPositive = asset.unrealizedPnl >= 0;
  const maturityDays = daysUntil(asset.maturityDate);
  const staleDays = daysSince(asset.lastUpdated);
  const isStale = staleDays !== null && staleDays > 7;
  const isNearMaturity = maturityDays !== null && maturityDays <= 7 && maturityDays >= 0;
  const isMatured = maturityDays !== null && maturityDays < 0;

  return (
    <>
      <Card
        className={cn(
          "surface-panel transition-shadow",
          (asset.assetType === "gold" || asset.assetType === "stock") && "cursor-pointer hover:shadow-md",
        )}
        onClick={() => {
          if (asset.assetType === "gold" || asset.assetType === "stock") onClick(asset);
        }}
      >
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground truncate">{asset.name}</p>
                {isNearMaturity && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="mr-1 h-3 w-3" />{t("maturesSoon", { days: maturityDays })}
                  </Badge>
                )}
                {isMatured && (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {t("matured")}
                  </Badge>
                )}
                {isStale && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mr-1 h-3 w-3" />{t("stalePrice")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize">{asset.assetType.replace("_", " ")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {(asset.assetType === "gold" || asset.assetType === "stock") && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdatePrice(asset)}>
                  <RefreshCw className="mr-1 h-3 w-3" />{t("updatePrice")}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(asset)}>{t("edit")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />{t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {asset.assetType === "savings_deposit" && (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">{t("principal")}</p><p className="font-medium">{fmt(asset.principal ?? 0)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("accrued")}</p><p className="font-medium text-emerald-600 dark:text-emerald-400">+{fmt(asset.unrealizedPnl)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("currentValue")}</p><p className="font-semibold">{fmt(asset.currentValue)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("maturity")}</p><p className="font-medium">{asset.maturityDate ?? "—"}</p></div>
            </div>
          )}

          {asset.assetType === "gold" && (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">{t("quantity")}</p><p className="font-medium">{asset.quantity} {asset.unit}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("costBasisUnit")}</p><p className="font-medium">{fmt(asset.costBasisPerUnit ?? 0)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("currentValue")}</p><p className="font-semibold">{fmt(asset.currentValue)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pnl")}</p>
                <p className={cn("font-semibold", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                  {isPositive ? "+" : ""}{fmt(asset.unrealizedPnl)} ({isPositive ? "+" : ""}{asset.pnlPct.toFixed(2)}%)
                </p>
              </div>
            </div>
          )}

          {asset.assetType === "stock" && (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">{t("ticker")}</p><p className="font-semibold">{asset.ticker} <span className="text-xs text-muted-foreground">({asset.exchange})</span></p></div>
              <div><p className="text-xs text-muted-foreground">{t("shares")}</p><p className="font-medium">{asset.quantity?.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("avgCost")}</p><p className="font-medium">{fmt(asset.avgCostPerShare ?? 0)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pnl")}</p>
                <p className={cn("font-semibold", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                  {isPositive ? "+" : ""}{fmt(asset.unrealizedPnl)} ({isPositive ? "+" : ""}{asset.pnlPct.toFixed(2)}%)
                </p>
              </div>
            </div>
          )}

          {asset.lastUpdated && (
            <p className="text-[11px] text-muted-foreground">{t("lastUpdated")}: {asset.lastUpdated}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("deleteTitle")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>{t("cancel")}</Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(asset.id, {
                onSuccess: () => { toast.success(t("deleteSuccess")); setConfirmDelete(false); },
                onError: () => toast.error(t("deleteError")),
              })}
            >
              {deleteMutation.isPending ? t("deleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Update price drawer
function UpdatePriceDrawer({
  open, onClose, asset, budgetId,
}: {
  open: boolean;
  onClose: () => void;
  asset: InvestAsset | null;
  budgetId: string;
}) {
  const t = useTranslations("budget.invest");
  const toast = useToast();
  const mutation = useAddPriceSnapshotMutation(budgetId);
  const [price, setPrice] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  if (!asset) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price.replace(/,/g, ""));
    if (!p || p <= 0) return;
    mutation.mutate(
      { assetId: asset!.id, price: p, snapshotDate: today },
      {
        onSuccess: () => { toast.success(t("priceUpdated")); onClose(); setPrice(""); },
        onError: () => toast.error(t("priceUpdateError")),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("updatePriceTitle")}</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>
        <SheetBody>
          <form id="price-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground">{asset.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("lastPrice")}: {asset.lastUpdated ? asset.lastUpdated : t("noPrice")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("newPrice")} ({today})</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" form="price-form" disabled={mutation.isPending}>
            {mutation.isPending ? t("saving") : t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Price history drawer
function PriceHistoryDrawer({
  open, onClose, asset,
}: {
  open: boolean;
  onClose: () => void;
  asset: InvestAsset | null;
}) {
  const t = useTranslations("budget.invest");
  const { data: snapshots = [], isLoading } = usePriceSnapshotsQuery(
    open && asset ? asset.id : null
  );

  if (!asset) return null;

  // Filter to last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recent = snapshots
    .filter((s) => new Date(s.snapshotDate) >= cutoff)
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));

  // Build SVG line chart
  const W = 520;
  const H = 120;
  const PAD = { top: 10, right: 8, bottom: 24, left: 8 };

  function buildPath(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return { line: "", area: "" };
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD.bottom} L${pts[0].x.toFixed(1)},${H - PAD.bottom} Z`;
    return { line, area };
  }

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  let svgContent: React.ReactNode = null;
  if (recent.length >= 2) {
    const prices = recent.map((s) => s.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = Math.max(1, maxP - minP);

    const pts = recent.map((s, i) => ({
      x: PAD.left + (i / (recent.length - 1)) * chartW,
      y: PAD.top + (1 - (s.price - minP) / range) * chartH,
    }));

    const { line, area } = buildPath(pts);

    svgContent = (
      <>
        <defs>
          <linearGradient id="ph-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ph-fill)" />
        <path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots for each data point */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
        ))}
      </>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{asset.name}</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>
        <SheetBody className="space-y-5">
          {/* Asset type label */}
          <p className="text-xs capitalize text-muted-foreground">
            {asset.assetType.replace("_", " ")} · {t("priceHistory")}
          </p>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recent.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">{t("noPriceHistory")}</p>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden>
                  {svgContent}
                </svg>
                {/* X-axis labels */}
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{recent[0]?.snapshotDate}</span>
                  <span>{recent[recent.length - 1]?.snapshotDate}</span>
                </div>
              </div>

              {/* Snapshot table */}
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 bg-muted/30">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("colDate")}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("colPrice")}</span>
                </div>
                <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
                  {[...recent].reverse().map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">{s.snapshotDate}</span>
                      <span className="font-semibold tabular-nums text-foreground">{fmt(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// Add / Edit asset dialog
function AddAssetDialog({
  open, onClose, budgetId, asset,
}: {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  asset?: InvestAsset;
}) {
  const t = useTranslations("budget.invest");
  const toast = useToast();
  const isEdit = Boolean(asset);
  const createMutation = useCreateAssetMutation(budgetId);
  const updateMutation = useUpdateAssetMutation(budgetId, asset?.id ?? "");

  const [assetType, setAssetType] = useState<AssetType>(asset?.assetType ?? "savings_deposit");
  const [name, setName] = useState(asset?.name ?? "");
  const [principal, setPrincipal] = useState(asset?.principal ? String(asset.principal) : "");
  const [annualRate, setAnnualRate] = useState(asset?.annualRate ? String(asset.annualRate * 100) : "");
  const [interestType, setInterestType] = useState(asset?.interestType ?? "simple");
  const [startDate, setStartDate] = useState(asset?.startDate ?? "");
  const [maturityDate, setMaturityDate] = useState(asset?.maturityDate ?? "");
  const [bankName, setBankName] = useState(asset?.bankName ?? "");
  const [quantity, setQuantity] = useState(asset?.quantity ? String(asset.quantity) : "");
  const [unit, setUnit] = useState<GoldUnit>(asset?.unit ?? "luong");
  const [costBasisPerUnit, setCostBasisPerUnit] = useState(asset?.costBasisPerUnit ? String(asset.costBasisPerUnit) : "");
  const [ticker, setTicker] = useState(asset?.ticker ?? "");
  const [exchange, setExchange] = useState<StockExchange>(asset?.exchange ?? "HOSE");
  const [avgCostPerShare, setAvgCostPerShare] = useState(asset?.avgCostPerShare ? String(asset.avgCostPerShare) : "");
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate ?? "");

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = { assetType, name: name.trim(), status: "active" as const, currentValue: 0, costBasis: 0, unrealizedPnl: 0, pnlPct: 0 };
    const payload =
      assetType === "savings_deposit"
        ? { ...base, principal: parseFloat(principal) || undefined, annualRate: annualRate ? parseFloat(annualRate) / 100 : undefined, interestType: interestType as "simple" | "compound", startDate: startDate || undefined, maturityDate: maturityDate || undefined, bankName: bankName || undefined }
        : assetType === "gold"
        ? { ...base, quantity: parseFloat(quantity) || undefined, unit: unit || undefined, costBasisPerUnit: parseFloat(costBasisPerUnit) || undefined, purchaseDate: purchaseDate || undefined }
        : { ...base, ticker: ticker.toUpperCase() || undefined, exchange: exchange || undefined, quantity: parseFloat(quantity) || undefined, avgCostPerShare: parseFloat(avgCostPerShare) || undefined, purchaseDate: purchaseDate || undefined };

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: () => { toast.success(t("updateSuccess")); onClose(); },
        onError: () => toast.error(t("updateError")),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success(t("createSuccess")); onClose(); },
        onError: () => toast.error(t("createError")),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? t("editTitle") : t("addTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t("assetType")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["savings_deposit", "gold", "stock"] as AssetType[]).map((v) => (
                  <button key={v} type="button" onClick={() => setAssetType(v)}
                    className={cn("rounded-xl border py-2 text-xs font-medium transition-colors", assetType === v ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                    {v === "savings_deposit" ? "💰 Savings" : v === "gold" ? "🥇 Gold" : "📈 Stock"}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? t("saving") : isEdit ? t("save") : t("add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main view
export function InvestBudgetView({ budgetId }: { budgetId: string }) {
  const t = useTranslations("budget.invest");
  const { data: assets = [], isLoading } = useInvestAssetsQuery(budgetId);

  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<InvestAsset | null>(null);
  const [priceAsset, setPriceAsset] = useState<InvestAsset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<InvestAsset | null>(null);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <PortfolioSummaryCard budgetId={budgetId} />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{t("assetsTitle")}</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />{t("addAsset")}
        </Button>
      </div>

      {isLoading ? (
        <SectionLoadingState rows={3} />
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptySubtitle")}</p>
          <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />{t("addAsset")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              budgetId={budgetId}
              onEdit={setEditAsset}
              onUpdatePrice={setPriceAsset}
              onClick={setHistoryAsset}
            />
          ))}
        </div>
      )}

      <AddAssetDialog open={addOpen} onClose={() => setAddOpen(false)} budgetId={budgetId} />
      {editAsset && <AddAssetDialog open onClose={() => setEditAsset(null)} budgetId={budgetId} asset={editAsset} />}
      <UpdatePriceDrawer open={Boolean(priceAsset)} onClose={() => setPriceAsset(null)} asset={priceAsset} budgetId={budgetId} />
      <PriceHistoryDrawer open={Boolean(historyAsset)} onClose={() => setHistoryAsset(null)} asset={historyAsset} />
    </div>
  );
}
