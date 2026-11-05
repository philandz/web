import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { planKeys, categoryKeys } from "@/lib/query-keys";
import { planService, type PlanItemInput } from "@/services/plan-service";

export function usePeriodSummaryQuery(budgetId: string | null, offset = 0) {
  return useQuery({
    queryKey: planKeys.summary(budgetId ?? "", offset),
    queryFn: () => planService.getPeriodSummary(budgetId!, offset),
    enabled: Boolean(budgetId),
    // spending changes while the page is open; keep it fresh but don't hammer the API
    staleTime: 15_000,
  });
}

export function usePlanQuery(budgetId: string | null, offset = 0) {
  return useQuery({
    queryKey: planKeys.plan(budgetId ?? "", offset),
    queryFn: () => planService.getPlan(budgetId!, offset),
    enabled: Boolean(budgetId),
  });
}

export function useSetPlanMutation(budgetId: string, offset = 0) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { items: PlanItemInput[]; unallocatedPlanned?: number }) =>
      planService.setPlan(budgetId, v.items, {
        unallocatedPlanned: v.unallocatedPlanned,
        periodOffset: offset,
      }),
    onSuccess: () => {
      // plan changes move every summary of this budget (rollover reads older plans too)
      void qc.invalidateQueries({ queryKey: planKeys.budget(budgetId) });
      void qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
