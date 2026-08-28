"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { portfolioService } from "@/services/portfolio-service";
import type {
  CryptoNetwork,
  EtfUnderlyingIndex,
  PortfolioAssetClass,
  StockExchange,
} from "@/services/portfolio-service";

/**
 * Form helpers for the new asset classes (ETF, Crypto). Phase 6.5
 * stubs the create flow: type picker, ticker / symbol input, fund
 * provider / custody wallet input, exchange / network picker,
 * quantity, buy price, fees, purchase date, notes. The wallet field
 * has basic format validation by network; full validation lives in
 * the backend.
 *
 * Submission is wired to `portfolioService.createEtfLot` and
 * `portfolioService.createCryptoLot`. On success, callers should
 * invalidate the assets query and close the dialog.
 */

const EXCHANGES: StockExchange[] = ["HOSE", "HNX", "UPCOM"];

const UNDERLYING_OPTIONS: EtfUnderlyingIndex[] = [
  "ETF_UNDERLYING_INDEX_VN30",
  "ETF_UNDERLYING_INDEX_VN100",
  "ETF_UNDERLYING_INDEX_HNX30",
  "ETF_UNDERLYING_INDEX_OTHER",
];

const NETWORK_OPTIONS: CryptoNetwork[] = [
  "CRYPTO_NETWORK_BITCOIN",
  "CRYPTO_NETWORK_ETHEREUM",
  "CRYPTO_NETWORK_SOLANA",
  "CRYPTO_NETWORK_BNB_CHAIN",
  "CRYPTO_NETWORK_POLKADOT",
  "CRYPTO_NETWORK_OTHER",
];

export interface CreateEtfLotFormProps {
  budgetId: string;
  onSuccess: () => void;
}

export function CreateEtfLotForm({ budgetId, onSuccess }: CreateEtfLotFormProps) {
  const t = useTranslations("budget.portfolio");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayEpoch = useMemo(() => Math.floor(Date.now() / 1000), []);

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState<StockExchange>("HOSE");
  const [underlyingIndex, setUnderlyingIndex] = useState<EtfUnderlyingIndex>(
    "ETF_UNDERLYING_INDEX_VN30",
  );
  const [fundProvider, setFundProvider] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date(todayEpoch * 1000).toISOString().slice(0, 10),
  );
  const [settlementDate, setSettlementDate] = useState("");
  const [notes, setNotes] = useState("");

  const isValid =
    displayName.trim().length > 0 &&
    ticker.trim().length > 0 &&
    fundProvider.trim().length > 0 &&
    quantity.trim().length > 0 &&
    parseFloat(quantity) > 0 &&
    parseFloat(price) > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await portfolioService.createEtfLot(budgetId, {
        displayName,
        currency,
        ticker,
        exchange,
        underlyingIndex,
        fundProvider,
        quantityBought: quantity,
        buyPricePerUnit: Math.round(parseFloat(price) * 1),
        fees: parseInt(fees || "0", 10) || 0,
        purchaseDate: Math.floor(new Date(purchaseDate).getTime() / 1000),
        settlementDate: settlementDate
          ? Math.floor(new Date(settlementDate).getTime() / 1000)
          : undefined,
        notes: notes || undefined,
        idempotencyKey: `etf-${Date.now()}`,
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={t("formDisplayName")} required>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("formCurrency")}>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </Field>
        <Field label={t("stockTicker")} required>
          <Input value={ticker} onChange={(e) => setTicker(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("stockExchange")}>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value as StockExchange)}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            {EXCHANGES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("etfUnderlying")} required>
          <select
            value={underlyingIndex}
            onChange={(e) =>
              setUnderlyingIndex(e.target.value as EtfUnderlyingIndex)
            }
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            {UNDERLYING_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {t(`etf_${u.split("_").pop()?.toLowerCase()}` as never) || u}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("etfFundProvider")} required>
        <Input
          value={fundProvider}
          onChange={(e) => setFundProvider(e.target.value)}
          placeholder="VinaCapital"
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t("stockQuantityBought")} required>
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            min="0"
            placeholder="100"
          />
        </Field>
        <Field label={t("stockBuyPrice")} required>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="0"
            placeholder="0"
          />
        </Field>
        <Field label={t("fees")}>
          <Input
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            type="number"
            min="0"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("stockPurchaseDate")} required>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </Field>
        <Field label={t("stockSettled")}>
          <Input
            type="date"
            value={settlementDate}
            onChange={(e) => setSettlementDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("formNotes")}>
        <textarea
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setNotes(e.target.value)
          }
          rows={2}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={!isValid || submitting}>
        {submitting ? t("formSaving") : t("formSave")}
      </Button>
    </form>
  );
}

export interface CreateCryptoLotFormProps {
  budgetId: string;
  onSuccess: () => void;
}

export function CreateCryptoLotForm({ budgetId, onSuccess }: CreateCryptoLotFormProps) {
  const t = useTranslations("budget.portfolio");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayEpoch = useMemo(() => Math.floor(Date.now() / 1000), []);

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("");
  const [network, setNetwork] = useState<CryptoNetwork>("CRYPTO_NETWORK_BITCOIN");
  const [custodyWallet, setCustodyWallet] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date(todayEpoch * 1000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  // Basic wallet format hint per network. Full validation lives in
  // the backend; the frontend just shows a hint so users can fix
  // obvious typos before submitting.
  const walletHint = useMemo(() => {
    switch (network) {
      case "CRYPTO_NETWORK_BITCOIN":
        return "bc1q... (bech32, 42 chars)";
      case "CRYPTO_NETWORK_ETHEREUM":
        return "0x... (40 hex chars)";
      case "CRYPTO_NETWORK_SOLANA":
        return "base58, 32-44 chars";
      default:
        return "";
    }
  }, [network]);

  const isValid =
    displayName.trim().length > 0 &&
    symbol.trim().length > 0 &&
    custodyWallet.trim().length > 0 &&
    quantity.trim().length > 0 &&
    parseFloat(quantity) > 0 &&
    parseFloat(price) > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await portfolioService.createCryptoLot(budgetId, {
        displayName,
        currency,
        symbol,
        network,
        custodyWallet,
        quantityBought: quantity,
        buyPricePerUnit: Math.round(parseFloat(price) * 1),
        fees: parseInt(fees || "0", 10) || 0,
        purchaseDate: Math.floor(new Date(purchaseDate).getTime() / 1000),
        notes: notes || undefined,
        idempotencyKey: `crypto-${Date.now()}`,
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={t("formDisplayName")} required>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("formCurrency")}>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </Field>
        <Field label={t("stockTicker")} required>
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </Field>
      </div>
      <Field label={t("cryptoNetwork")} required>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as CryptoNetwork)}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          {NETWORK_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {t(`crypto_${n.split("_").pop()?.toLowerCase()}` as never) || n}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("cryptoCustodyWallet")} required>
        <Input
          value={custodyWallet}
          onChange={(e) => setCustodyWallet(e.target.value)}
          placeholder={walletHint || "0x... / bc1q..."}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t("stockQuantityBought")} required>
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            min="0"
          />
        </Field>
        <Field label={t("stockBuyPrice")} required>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="0"
          />
        </Field>
        <Field label={t("fees")}>
          <Input
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            type="number"
            min="0"
          />
        </Field>
      </div>
      <Field label={t("stockPurchaseDate")} required>
        <Input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </Field>
      <Field label={t("formNotes")}>
        <textarea
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setNotes(e.target.value)
          }
          rows={2}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={!isValid || submitting}>
        {submitting ? t("formSaving") : t("formSave")}
      </Button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
/**
 * Tabbed "Add asset" dialog for the new asset classes. Phase 6.6:
 * - Sav/Fd/Gold/Stock use the legacy `AddAssetDialog` already in
 *   `invest-budget-view.tsx` — keeping the existing UX intact.
 * - ETF and Crypto use this dialog because their fields diverge
 *   (no principal/interestType, custody wallet, etc.).
 * - Phase 7 will merge all six into one tabbed dialog once
 *   `useCreateAssetMutation` is retired.
 */

export interface AddAssetClassDialogProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  onCreated?: () => void;
}

const ETF_CRYPTO_TABS: PortfolioAssetClass[] = [
  "etf_lot",
  "crypto_lot",
];

export function AddEtfCryptoAssetDialog({
  open,
  onClose,
  budgetId,
  onCreated,
}: AddAssetClassDialogProps) {
  const t = useTranslations("budget.portfolio");
  const [activeTab, setActiveTab] = useState<PortfolioAssetClass>("etf_lot");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("formTitleCreate")}</DialogTitle>
        </DialogHeader>
        <div role="tablist" className="flex gap-2 border-b border-border pb-2">
          {ETF_CRYPTO_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground")
                }
              >
                {tab === "etf_lot"
                  ? t("classEtfLot")
                  : t("classCryptoLot")}
              </button>
            );
          })}
        </div>
        <div className="py-2">
          {activeTab === "etf_lot" ? (
            <CreateEtfLotForm
              budgetId={budgetId}
              onSuccess={() => {
                onCreated?.();
                onClose();
              }}
            />
          ) : (
            <CreateCryptoLotForm
              budgetId={budgetId}
              onSuccess={() => {
                onCreated?.();
                onClose();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
