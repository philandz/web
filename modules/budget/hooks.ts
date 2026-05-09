import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  budgetService,
  type Budget,
  type BudgetListParams,
  type BudgetRole,
  type BudgetType,
  type RolloverPolicy,
} from "@/services/budget-service";
import { budgetKeys } from "@/lib/query-keys";

// ---------------------------------------------------------------------------
// Budget CRUD
// ---------------------------------------------------------------------------

export function useBudgetsQuery(params: BudgetListParams) {
  return useQuery({
    queryKey: budgetKeys.list(params),
    queryFn: () => budgetService.listBudgets(params),
    enabled: Boolean(params.orgId),
    placeholderData: (prev) => prev,
  });
}

export function useBudgetQuery(budgetId: string | null) {
  return useQuery({
    queryKey: budgetKeys.detail(budgetId ?? ""),
    queryFn: () => budgetService.getBudget(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useCreateBudgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: budgetService.createBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.lists() }),
  });
}

export function useUpdateBudgetMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; type?: BudgetType }) =>
      budgetService.updateBudget(budgetId, input),
    onSuccess: (updated: Budget) => {
      qc.setQueryData(budgetKeys.detail(budgetId), updated);
      qc.invalidateQueries({ queryKey: budgetKeys.lists() });
    },
  });
}

export function useDeleteBudgetMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => budgetService.deleteBudget(budgetId),
    onSuccess: () => {
      qc.removeQueries({ queryKey: budgetKeys.detail(budgetId) });
      qc.invalidateQueries({ queryKey: budgetKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function useBudgetMembersQuery(budgetId: string | null) {
  return useQuery({
    queryKey: budgetKeys.members(budgetId ?? ""),
    queryFn: () => budgetService.listMembers(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useAddMemberMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: BudgetRole }) =>
      budgetService.addMember(budgetId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.members(budgetId) }),
  });
}

export function useUpdateMemberRoleMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: BudgetRole }) =>
      budgetService.updateMemberRole(budgetId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.members(budgetId) }),
  });
}

export function useRemoveMemberMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => budgetService.removeMember(budgetId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.members(budgetId) }),
  });
}

// ---------------------------------------------------------------------------
// Envelope limit & burn-rate
// ---------------------------------------------------------------------------

export function useBurnRateQuery(budgetId: string | null) {
  return useQuery({
    queryKey: budgetKeys.burnRate(budgetId ?? ""),
    queryFn: () => budgetService.getBurnRate(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useSetEnvelopeMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (monthlyLimit: number) =>
      budgetService.setEnvelope(budgetId, monthlyLimit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: budgetKeys.burnRate(budgetId) });
      qc.invalidateQueries({ queryKey: budgetKeys.envelope(budgetId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Rollover policy
// ---------------------------------------------------------------------------

export function useRolloverQuery(budgetId: string | null) {
  return useQuery({
    queryKey: budgetKeys.rollover(budgetId ?? ""),
    queryFn: () => budgetService.getRollover(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useSetRolloverMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policy: RolloverPolicy) =>
      budgetService.setRollover(budgetId, policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.rollover(budgetId) }),
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function useTemplatesQuery() {
  return useQuery({
    queryKey: budgetKeys.templates(),
    queryFn: budgetService.listTemplates,
    staleTime: 5 * 60 * 1000, // templates rarely change
  });
}
