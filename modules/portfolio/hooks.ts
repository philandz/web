import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { portfolioKeys } from "@/lib/query-keys";
import {
  portfolioService,
  type AssetSource,
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
export type { AssetSource, PortfolioAsset, PortfolioSummary, PriceObservation, ValuatedAsset };