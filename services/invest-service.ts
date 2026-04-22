import { apiClient } from "@/lib/http/client";

const BASE = "/api/budget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetType = "savings_deposit" | "gold" | "stock";
export type AssetStatus = "active" | "matured" | "sold" | "closed";
export type InterestType = "simple" | "compound";
export type GoldUnit = "chi" | "luong" | "gram";
export type StockExchange = "HOSE" | "HNX" | "UPCOM";
export type PriceSource = "manual" | "auto_sjc" | "auto_tcbs";

export interface InvestAsset {
  id: string;
  budgetId: string;
  assetType: AssetType;
  name: string;
  status: AssetStatus;
  // savings_deposit
  principal?: number;
  annualRate?: number;
  interestType?: InterestType;
  startDate?: string;
  maturityDate?: string;
  bankName?: string;
  // gold
  quantity?: number;
  unit?: GoldUnit;
  costBasisPerUnit?: number;
  // stock
  ticker?: string;
  exchange?: StockExchange;
  avgCostPerShare?: number;
  // shared computed
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  pnlPct: number;
  lastUpdated?: string;
  purchaseDate?: string;
}

export interface PortfolioSummary {
  totalCurrentValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalPnlPct: number;
}

export interface PriceSnapshot {
  id: string;
  assetId: string;
  price: number;
  snapshotDate: string;
  source: PriceSource;
}

// ---------------------------------------------------------------------------
// Raw shapes
// ---------------------------------------------------------------------------

interface RawAsset {
  id: string;
  budget_id: string;
  asset_type: string;
  name: string;
  status: string;
  principal?: number;
  annual_rate?: number;
  interest_type?: string;
  start_date?: string;
  maturity_date?: string;
  bank_name?: string;
  quantity?: number;
  unit?: string;
  cost_basis_per_unit?: number;
  ticker?: string;
  exchange?: string;
  avg_cost_per_share?: number;
  current_value?: number;
  cost_basis?: number;
  unrealized_pnl?: number;
  pnl_pct?: number;
  last_updated?: string;
  purchase_date?: string;
}

interface RawPortfolio {
  total_current_value: number;
  total_cost_basis: number;
  total_unrealized_pnl: number;
  total_pnl_pct: number;
}

interface RawSnapshot {
  id: string;
  asset_id: string;
  price: number;
  snapshot_date: string;
  source: string;
}

function mapAsset(raw: RawAsset): InvestAsset {
  return {
    id: raw.id,
    budgetId: raw.budget_id,
    assetType: raw.asset_type as AssetType,
    name: raw.name,
    status: raw.status as AssetStatus,
    principal: raw.principal,
    annualRate: raw.annual_rate,
    interestType: raw.interest_type as InterestType | undefined,
    startDate: raw.start_date,
    maturityDate: raw.maturity_date,
    bankName: raw.bank_name,
    quantity: raw.quantity,
    unit: raw.unit as GoldUnit | undefined,
    costBasisPerUnit: raw.cost_basis_per_unit,
    ticker: raw.ticker,
    exchange: raw.exchange as StockExchange | undefined,
    avgCostPerShare: raw.avg_cost_per_share,
    currentValue: raw.current_value ?? 0,
    costBasis: raw.cost_basis ?? 0,
    unrealizedPnl: raw.unrealized_pnl ?? 0,
    pnlPct: raw.pnl_pct ?? 0,
    lastUpdated: raw.last_updated,
    purchaseDate: raw.purchase_date,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const investService = {
  async listAssets(budgetId: string): Promise<InvestAsset[]> {
    const raw = await apiClient.get<{ assets: RawAsset[] }>(
      `${BASE}/budgets/${budgetId}/invest/assets`
    );
    return (raw.assets ?? []).map(mapAsset);
  },

  async getPortfolioSummary(budgetId: string): Promise<PortfolioSummary> {
    const raw = await apiClient.get<{ portfolio: RawPortfolio }>(
      `${BASE}/budgets/${budgetId}/invest/portfolio`
    );
    return {
      totalCurrentValue: raw.portfolio.total_current_value,
      totalCostBasis: raw.portfolio.total_cost_basis,
      totalUnrealizedPnl: raw.portfolio.total_unrealized_pnl,
      totalPnlPct: raw.portfolio.total_pnl_pct,
    };
  },

  async createAsset(budgetId: string, input: Omit<InvestAsset, "id" | "budgetId" | "currentValue" | "costBasis" | "unrealizedPnl" | "pnlPct">): Promise<InvestAsset> {
    const raw = await apiClient.post<{ asset: RawAsset }>(
      `${BASE}/budgets/${budgetId}/invest/assets`,
      {
        asset_type: input.assetType,
        name: input.name,
        principal: input.principal,
        annual_rate: input.annualRate,
        interest_type: input.interestType,
        start_date: input.startDate,
        maturity_date: input.maturityDate,
        bank_name: input.bankName,
        quantity: input.quantity,
        unit: input.unit,
        cost_basis_per_unit: input.costBasisPerUnit,
        ticker: input.ticker,
        exchange: input.exchange,
        avg_cost_per_share: input.avgCostPerShare,
        purchase_date: input.purchaseDate,
      }
    );
    return mapAsset(raw.asset);
  },

  async updateAsset(budgetId: string, assetId: string, input: Partial<InvestAsset>): Promise<InvestAsset> {
    const raw = await apiClient.patch<{ asset: RawAsset }>(
      `${BASE}/budgets/${budgetId}/invest/assets/${assetId}`,
      {
        name: input.name,
        annual_rate: input.annualRate,
        maturity_date: input.maturityDate,
        bank_name: input.bankName,
        quantity: input.quantity,
        unit: input.unit,
        cost_basis_per_unit: input.costBasisPerUnit,
        avg_cost_per_share: input.avgCostPerShare,
      }
    );
    return mapAsset(raw.asset);
  },

  async deleteAsset(budgetId: string, assetId: string): Promise<void> {
    await apiClient.request(
      `${BASE}/budgets/${budgetId}/invest/assets/${assetId}`,
      { method: "DELETE" }
    );
  },

  async addPriceSnapshot(assetId: string, price: number, snapshotDate: string): Promise<PriceSnapshot> {
    const raw = await apiClient.post<{ snapshot: RawSnapshot }>(
      `${BASE}/invest/assets/${assetId}/snapshots`,
      { price, snapshot_date: snapshotDate, source: "manual" }
    );
    return {
      id: raw.snapshot.id,
      assetId: raw.snapshot.asset_id,
      price: raw.snapshot.price,
      snapshotDate: raw.snapshot.snapshot_date,
      source: raw.snapshot.source as PriceSource,
    };
  },

  async listPriceSnapshots(assetId: string): Promise<PriceSnapshot[]> {
    const raw = await apiClient.get<{ snapshots: RawSnapshot[] }>(
      `${BASE}/invest/assets/${assetId}/snapshots`
    );
    return (raw.snapshots ?? []).map((s) => ({
      id: s.id,
      assetId: s.asset_id,
      price: s.price,
      snapshotDate: s.snapshot_date,
      source: s.source as PriceSource,
    }));
  },
};
