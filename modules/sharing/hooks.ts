"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingService } from "@/services/sharing-service";

export const sharingKeys = {
  all: ["sharing"] as const,
  expenses: (budgetId: string) => [...sharingKeys.all, "expenses", budgetId] as const,
  settlement: (budgetId: string) => [...sharingKeys.all, "settlement", budgetId] as const,
};

export function useExpensesQuery(budgetId: string) {
  return useQuery({
    queryKey: sharingKeys.expenses(budgetId),
    queryFn: () => sharingService.listExpenses(budgetId),
  });
}

export function useSettlementQuery(budgetId: string) {
  return useQuery({
    queryKey: sharingKeys.settlement(budgetId),
    queryFn: () => sharingService.calculateSettlement(budgetId),
  });
}

export function useAddExpenseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sharingService.addExpense,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sharingKeys.expenses(vars.budgetId) });
    },
  });
}

export function useDeleteExpenseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sharingService.deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharingKeys.all });
    },
  });
}