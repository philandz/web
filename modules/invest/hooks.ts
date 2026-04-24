import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { investService, type InvestAsset } from "@/services/invest-service";
import { investKeys } from "@/lib/query-keys";

export function useInvestAssetsQuery(budgetId: string | null) {
  return useQuery({
    queryKey: investKeys.assets(budgetId ?? ""),
    queryFn: () => investService.listAssets(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function usePortfolioSummaryQuery(budgetId: string | null) {
  return useQuery({
    queryKey: investKeys.portfolio(budgetId ?? ""),
    queryFn: () => investService.getPortfolioSummary(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useCreateAssetMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<InvestAsset, "id" | "budgetId" | "currentValue" | "costBasis" | "unrealizedPnl" | "pnlPct">) =>
      investService.createAsset(budgetId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: investKeys.assets(budgetId) });
      qc.invalidateQueries({ queryKey: investKeys.portfolio(budgetId) });
    },
  });
}

export function useUpdateAssetMutation(budgetId: string, assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<InvestAsset>) =>
      investService.updateAsset(budgetId, assetId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: investKeys.assets(budgetId) });
      qc.invalidateQueries({ queryKey: investKeys.portfolio(budgetId) });
    },
  });
}

export function useDeleteAssetMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => investService.deleteAsset(budgetId, assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: investKeys.assets(budgetId) });
      qc.invalidateQueries({ queryKey: investKeys.portfolio(budgetId) });
    },
  });
}

export function useAddPriceSnapshotMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      price,
      snapshotDate,
    }: {
      assetId: string;
      price: number;
      snapshotDate: string;
    }) => investService.addPriceSnapshot(assetId, price, snapshotDate),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: investKeys.snapshots(vars.assetId) });
      qc.invalidateQueries({ queryKey: investKeys.assets(budgetId) });
      qc.invalidateQueries({ queryKey: investKeys.portfolio(budgetId) });
    },
  });
}

export function usePriceSnapshotsQuery(assetId: string | null) {
  return useQuery({
    queryKey: investKeys.snapshots(assetId ?? ""),
    queryFn: () => investService.listPriceSnapshots(assetId!),
    enabled: Boolean(assetId),
  });
}
