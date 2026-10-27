import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";

import { portfolioKeys } from "@/lib/query-keys";
import {
  portfolioService,
  type FundTransferBody,
  type AssetSource,
  type FundSummary,
  type PortfolioAsset,
  type PortfolioSummary,
  type PriceObservation,
  type ValuatedAsset,
} from "@/services/portfolio-service";

export function usePortfolioAssetsQuery(budgetId: string | null, source?: AssetSource) {
  return useQuery({
    queryKey: portfolioKeys.list({ budgetId: budgetId ?? "", source }),
    queryFn: () => portfolioService.listAssets(budgetId!, { source }),
    enabled: Boolean(budgetId),
  });
}

export function usePortfolioAssetQuery(
  budgetId: string | null,
  assetId: string | null,
) {
  return useQuery({
    queryKey: portfolioKeys.detail(budgetId ?? "", assetId ?? ""),
    queryFn: () => portfolioService.getAsset(budgetId!, assetId!),
    enabled: Boolean(budgetId) && Boolean(assetId),
  });
}

export function usePortfolioSummaryQuery(
  budgetId: string | null,
  source?: AssetSource,
) {
  return useQuery({
    queryKey: portfolioKeys.summary(budgetId ?? "", source),
    queryFn: () => portfolioService.getSummary(budgetId!, { source }),
    enabled: Boolean(budgetId),
  });
}

export function usePriceObservationsQuery(
  budgetId: string | null,
  assetId: string | null,
  limit?: number,
) {
  return useQuery({
    queryKey: [...portfolioKeys.observations(budgetId ?? "", assetId ?? ""), limit ?? 50],
    queryFn: () => portfolioService.listPrices(budgetId!, assetId!, limit),
    enabled: Boolean(budgetId) && Boolean(assetId),
  });
}

export function useAssetActivityQuery(
  budgetId: string | null,
  assetId: string | null,
  limit?: number,
) {
  return useQuery({
    queryKey: [...portfolioKeys.activity(budgetId ?? "", assetId ?? ""), limit ?? 50],
    queryFn: () => portfolioService.listActivity(budgetId!, assetId!, limit),
    enabled: Boolean(budgetId) && Boolean(assetId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function useInvalidator(budgetId: string, assetId?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: portfolioKeys.list({ budgetId }) });
    qc.invalidateQueries({ queryKey: portfolioKeys.summary(budgetId) });
    if (assetId) {
      qc.invalidateQueries({
        queryKey: portfolioKeys.detail(budgetId, assetId),
      });
    }
  };
}

export function useCreateSavingsAccountMutation(budgetId: string) {
  const invalidate = useInvalidator(budgetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.createSavingsAccount>[1],
    ) => portfolioService.createSavingsAccount(budgetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateFixedDepositMutation(budgetId: string) {
  const invalidate = useInvalidator(budgetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.createFixedDeposit>[1],
    ) => portfolioService.createFixedDeposit(budgetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateGoldLotMutation(budgetId: string) {
  const invalidate = useInvalidator(budgetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.createGoldLot>[1],
    ) => portfolioService.createGoldLot(budgetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateStockLotMutation(budgetId: string) {
  const invalidate = useInvalidator(budgetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.createStockLot>[1],
    ) => portfolioService.createStockLot(budgetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAssetMetadataMutation(budgetId: string, assetId: string) {
  const invalidate = useInvalidator(budgetId, assetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.updateMetadata>[2],
    ) => portfolioService.updateMetadata(budgetId, assetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveAssetMutation(budgetId: string, assetId: string) {
  const invalidate = useInvalidator(budgetId, assetId);
  return useMutation({
    mutationFn: () => portfolioService.archive(budgetId, assetId),
    onSuccess: () => invalidate(),
  });
}

export function useRecordPriceMutation(budgetId: string, assetId: string) {
  const invalidate = useInvalidator(budgetId, assetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.recordPrice>[2],
    ) => portfolioService.recordPrice(budgetId, assetId, input),
    onSuccess: () => invalidate(),
  });
}

export function useRecordStockDisposalMutation(budgetId: string, assetId: string) {
  const invalidate = useInvalidator(budgetId, assetId);
  return useMutation({
    mutationFn: (
      input: Parameters<typeof portfolioService.recordStockDisposal>[2],
    ) => portfolioService.recordStockDisposal(budgetId, assetId, input),
    onSuccess: () => invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export type {
  AssetSource,
  FundSummary,
  PortfolioAsset,
  PortfolioSummary,
  PriceObservation,
  ValuatedAsset,
};
export function useFundSummaryQuery(budgetId: string | null) {
  return useQuery({
    queryKey: portfolioKeys.fund(budgetId ?? ""),
    queryFn: () => portfolioService.getFundSummary(budgetId!),
    enabled: Boolean(budgetId),
  });
}

/**
 * Fund summaries for several saving budgets at once (one request per budget, in parallel).
 *
 * Reuses `portfolioKeys.fund(budgetId)` so the budget list and
 * `components/philand/portfolio/fund-panel.tsx` share the same cache entry.
 * Budgets whose summary has not loaded (or that errored) are absent from the
 * map — the card renders its own fallback for those.
 */
export function useFundSummaries(budgetIds: string[]): Map<string, FundSummary> {
  const ids = Array.from(new Set(budgetIds.filter((id) => Boolean(id))));

  const queries = useQueries({
    queries: ids.map((budgetId) => ({
      queryKey: portfolioKeys.fund(budgetId),
      queryFn: () => portfolioService.getFundSummary(budgetId),
    })),
  });

  const summaries = new Map<string, FundSummary>();
  ids.forEach((budgetId, index) => {
    const query = queries[index];
    if (!query?.isSuccess || !query.data) return;
    summaries.set(budgetId, query.data);
  });
  return summaries;
}

export function useFundMovementsQuery(budgetId: string | null, page = 1) {
  return useQuery({
    queryKey: portfolioKeys.fundMovements(budgetId ?? "", page),
    queryFn: () => portfolioService.listFundMovements(budgetId!, { page, pageSize: 20 }),
    enabled: Boolean(budgetId),
  });
}

/** Deposit moves money from a standard budget into the fund; withdraw is the reverse. */
export function useFundTransferMutation(budgetId: string, direction: "deposit" | "withdraw") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FundTransferBody) =>
      direction === "deposit"
        ? portfolioService.depositToFund(budgetId, body)
        : portfolioService.withdrawFromFund(budgetId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portfolioKeys.fund(budgetId) });
      void qc.invalidateQueries({ queryKey: portfolioKeys.summary(budgetId) });
      // the counterparty budget's transactions and totals changed too
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useCreateHoldingMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      kind: "fixed-deposit" | "savings-account" | "gold-lot";
      body: Record<string, unknown>;
    }) => portfolioService.createHolding(budgetId, input.kind, input.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portfolioKeys.lists() });
      void qc.invalidateQueries({ queryKey: portfolioKeys.fund(budgetId) });
      void qc.invalidateQueries({ queryKey: portfolioKeys.summary(budgetId) });
    },
  });
}
