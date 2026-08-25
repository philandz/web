import { apiClient } from "@/lib/http/client";

const BASE = "/api/budget";

// ---------------------------------------------------------------------------
// Types — Asset Portfolio MVP
// ---------------------------------------------------------------------------

export type PortfolioAssetClass =
  | "savings_account"
  | "fixed_deposit"
  | "gold_lot"
  | "stock_lot"
  | "etf_lot"
  | "crypto_lot";

export type PortfolioAssetStatus =
  | "active"
  | "closed"
  | "matured"
  | "sold"
  | "archived"
  | "rolled_over"
  | "withdrawn"
  | "early_closed";

export type InterestMethod = "SIMPLE" | "COMPOUND" | "UNSPECIFIED";

export type PayoutType =
  | "AT_MATURITY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ON_DEMAND"
  | "UNSPECIFIED";

export type AutoRenewalPolicy =
  | "NONE"
  | "PRINCIPAL_ONLY"
  | "PRINCIPAL_AND_INTEREST"
  | "UNSPECIFIED";

export type GoldPurity =
  | "SJC_9999"
  | "PNJ_999"
  | "PNJ_995"
  | "DOJI_9999"
  | "OTHER"
  | "GOLD_PURITY_UNSPECIFIED";

export type GoldForm =
  | "BAR"
  | "RING"
  | "COIN"
  | "JEWELRY"
  | "OTHER"
  | "GOLD_FORM_UNSPECIFIED";

export type GoldUnit = "CHI" | "LUONG" | "GRAM" | "GOLD_UNIT_UNSPECIFIED";

export type StockExchange =
  | "HOSE"
  | "HNX"
  | "UPCOM"
  | "STOCK_EXCHANGE_UNSPECIFIED";

export type PriceSide = "BID" | "ASK" | "MID" | "PRICE_SIDE_UNSPECIFIED";

export type PriceFreshness = "FRESH" | "STALE" | "UNPRICED" | "PRICE_FRESHNESS_UNSPECIFIED";

export type ActivityType =
  | "CREATED"
  | "UPDATED_METADATA"
  | "BALANCE_ADJUSTED"
  | "RATE_RECORDED"
  | "PRICE_OBSERVED"
  | "DISPOSAL_RECORDED"
  | "STATUS_CHANGED"
  | "MATURITY_REACHED"
  | "ROLLED_OVER"
  | "TRANSFER_INITIATED"
  | "TRANSFER_COMPLETED"
  | "ARCHIVED"
  | "DELETED"
  | "ACTIVITY_TYPE_UNSPECIFIED";

export type AssetSource = "portfolio" | "legacy";

export interface PortfolioBase {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
  createdBy: string;
  updatedBy: string;
  ownerId: string;
  status: number;
}

export interface PortfolioSavingsAccount {
  assetId: string;
  provider: string;
  accountReferenceMasked: string;
  currentBalance: number;
  balanceAsOf: number;
  annualRate: number;
  interestMethod: InterestMethod;
  payoutType: PayoutType;
  openedOn: number;
  notes: string;
}

export interface PortfolioFixedDeposit {
  assetId: string;
  provider: string;
  productName: string;
  principal: number;
  annualRate: number;
  interestMethod: InterestMethod;
  payoutType: PayoutType;
  depositDate: number;
  maturityDate: number;
  autoRenewalPolicy: AutoRenewalPolicy;
  rolloverFromAssetId: string;
  certificateReferenceMasked: string;
  notes: string;
}

export interface PortfolioGoldLot {
  assetId: string;
  provider: string;
  goldType: string;
  purity: GoldPurity;
  form: GoldForm;
  quantityOriginal: string;
  unitOriginal: GoldUnit;
  quantityGrams: string;
  purchasePricePerUnitOriginal: number;
  purchaseCost: number;
  fees: number;
  purchaseDate: number;
  notes: string;
}

export interface PortfolioStockLot {
  assetId: string;
  ticker: string;
  exchange: StockExchange;
  quantityBought: string;
  quantityOpen: string;
  buyPricePerShare: number;
  purchaseCost: number;
  fees: number;
  purchaseDate: number;
  settlementDate: number;
  notes: string;
}

export type EtfUnderlyingIndex =
  | "ETF_UNDERLYING_INDEX_UNSPECIFIED"
  | "ETF_UNDERLYING_INDEX_VN30"
  | "ETF_UNDERLYING_INDEX_VN100"
  | "ETF_UNDERLYING_INDEX_HNX30"
  | "ETF_UNDERLYING_INDEX_OTHER";

export interface PortfolioEtfLot {
  assetId: string;
  ticker: string;
  exchange: StockExchange;
  underlyingIndex: EtfUnderlyingIndex;
  fundProvider: string;
  quantityBought: string;
  quantityOpen: string;
  buyPricePerUnit: number;
  purchaseCost: number;
  fees: number;
  purchaseDate: number;
  settlementDate: number;
  notes: string;
}

export type CryptoNetwork =
  | "CRYPTO_NETWORK_UNSPECIFIED"
  | "CRYPTO_NETWORK_BITCOIN"
  | "CRYPTO_NETWORK_ETHEREUM"
  | "CRYPTO_NETWORK_SOLANA"
  | "CRYPTO_NETWORK_BNB_CHAIN"
  | "CRYPTO_NETWORK_POLKADOT"
  | "CRYPTO_NETWORK_OTHER";

export interface PortfolioCryptoLot {
  assetId: string;
  symbol: string;
  network: CryptoNetwork;
  custodyWallet: string;
  quantityBought: string;
  quantityOpen: string;
  buyPricePerUnit: number;
  purchaseCost: number;
  fees: number;
  purchaseDate: number;
  notes: string;
}

export interface PortfolioAsset {
  base?: PortfolioBase;
  budgetId: string;
  assetClass: PortfolioAssetClass;
  displayName: string;
  currency: string;
  status: PortfolioAssetStatus;
  openedOn: number;
  closedOn: number;
  legacyAssetId: string;
  notes: string;
  // oneof in proto — at most one populated per response
  savingsAccount?: PortfolioSavingsAccount;
  fixedDeposit?: PortfolioFixedDeposit;
  goldLot?: PortfolioGoldLot;
  stockLot?: PortfolioStockLot;
  etfLot?: PortfolioEtfLot;
  cryptoLot?: PortfolioCryptoLot;
  // from gateway dual-read
  source?: AssetSource;
}

export interface ValuatedAsset {
  asset?: PortfolioAsset;
  currentValue: number;
  openCostBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  accruedInterest: number;
  returnPct: number;
  freshness: PriceFreshness;
  quoteObservedAt: number;
  formulaVersion: string;
}

export interface PortfolioSummary {
  budgetId: string;
  totalCurrentValue: number;
  totalOpenCostBasis: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  totalReturnPct: number;
  currency: string;
  assets: ValuatedAsset[];
  // dual-read hint
  source?: AssetSource;
}

export interface PriceObservation {
  id: string;
  assetId: string;
  provider: string;
  priceSide: PriceSide;
  unitPrice: number;
  currency: string;
  observedAt: number;
  sourceReference: string;
  notes: string;
}

export interface PortfolioActivity {
  id: string;
  assetId: string;
  budgetId: string;
  activityType: ActivityType;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
  occurredAt: number;
  payloadJson: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const portfolioService = {
  listAssets(budgetId: string, opts?: { source?: AssetSource; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (opts?.source) search.set("source", opts.source);
    if (opts?.page) search.set("page", String(opts.page));
    if (opts?.pageSize) search.set("page_size", String(opts.pageSize));
    const qs = search.toString();
    return apiClient.get<{ assets: ValuatedAsset[]; total_rows: number }>(
      `${BASE}/budgets/${budgetId}/portfolio/assets${qs ? `?${qs}` : ""}`,
    );
  },

  getAsset(budgetId: string, assetId: string) {
    return apiClient.get<{ asset: ValuatedAsset }>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}`,
    );
  },

  getSummary(budgetId: string, opts?: { source?: AssetSource }) {
    const search = new URLSearchParams();
    if (opts?.source) search.set("source", opts.source);
    const qs = search.toString();
    return apiClient.get<PortfolioSummary>(
      `${BASE}/budgets/${budgetId}/portfolio/summary${qs ? `?${qs}` : ""}`,
    );
  },

  updateMetadata(
    budgetId: string,
    assetId: string,
    body: { displayName?: string; notes?: string },
  ) {
    return apiClient.patch<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}`,
      body,
    );
  },

  archive(budgetId: string, assetId: string) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}/archive`,
      {},
    );
  },

  createSavingsAccount(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      provider: string;
      accountReferenceMasked: string;
      currentBalance: number;
      balanceAsOf: number;
      annualRate: number;
      interestMethod: InterestMethod;
      payoutType: PayoutType;
      openedOn: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/savings-account`,
      body,
    );
  },

  createFixedDeposit(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      provider: string;
      productName: string;
      principal: number;
      annualRate: number;
      interestMethod: InterestMethod;
      payoutType: PayoutType;
      depositDate: number;
      maturityDate: number;
      autoRenewalPolicy: AutoRenewalPolicy;
      certificateReferenceMasked: string;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/fixed-deposit`,
      body,
    );
  },

  createGoldLot(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      provider: string;
      goldType: string;
      purity: GoldPurity;
      form: GoldForm;
      quantityOriginal: string;
      unitOriginal: GoldUnit;
      purchasePricePerUnitOriginal: number;
      purchaseCost: number;
      fees: number;
      purchaseDate: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/gold-lot`,
      body,
    );
  },

  createStockLot(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      ticker: string;
      exchange: StockExchange;
      quantityBought: string;
      buyPricePerShare: number;
      fees: number;
      purchaseDate: number;
      settlementDate?: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/stock-lot`,
      body,
    );
  },

  createEtfLot(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      ticker: string;
      exchange: StockExchange;
      underlyingIndex: EtfUnderlyingIndex;
      fundProvider: string;
      quantityBought: string;
      buyPricePerUnit: number;
      fees: number;
      purchaseDate: number;
      settlementDate?: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/etf-lot`,
      body,
    );
  },

  createCryptoLot(
    budgetId: string,
    body: {
      displayName: string;
      currency: string;
      symbol: string;
      network: CryptoNetwork;
      custodyWallet: string;
      quantityBought: string;
      buyPricePerUnit: number;
      fees: number;
      purchaseDate: number;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/crypto-lot`,
      body,
    );
  },

  recordPrice(
    budgetId: string,
    assetId: string,
    body: {
      priceSide: PriceSide;
      unitPrice: number;
      currency: string;
      observedAt?: number;
      sourceReference?: string;
      notes?: string;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PriceObservation>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}/observations`,
      body,
    );
  },

  listPrices(budgetId: string, assetId: string, limit?: number) {
    const search = new URLSearchParams();
    if (limit) search.set("limit", String(limit));
    const qs = search.toString();
    return apiClient.get<{ observations: PriceObservation[] }>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}/observations${qs ? `?${qs}` : ""}`,
    );
  },

  listActivity(budgetId: string, assetId: string, limit?: number) {
    const search = new URLSearchParams();
    if (limit) search.set("limit", String(limit));
    const qs = search.toString();
    return apiClient.get<{ activities: PortfolioActivity[] }>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}/activity${qs ? `?${qs}` : ""}`,
    );
  },

  recordStockDisposal(
    budgetId: string,
    assetId: string,
    body: {
      quantitySold: string;
      saleProceeds: number;
      saleFees: number;
      disposalDate?: number;
      idempotencyKey?: string;
    },
  ) {
    return apiClient.post<PortfolioAsset>(
      `${BASE}/budgets/${budgetId}/portfolio/assets/${assetId}/stock-disposal`,
      body,
    );
  },

  /** Force-refresh portfolio valuations from price providers (admin action). */
  refreshPortfolio(budgetId: string) {
    return apiClient.post<{ ok: boolean }>(
      `${BASE}/budgets/${budgetId}/portfolio/refresh`,
      {},
    );
  },
};