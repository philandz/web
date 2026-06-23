"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingService } from "@/services/sharing-service";
import type {
  AddExpenseItemInput,
  ExpenseComment,
  ActivityLogEntry,
  SettlementConfirmation,
  ParticipantInfo,
  JoinLinkPreview,
  JoinAsGuestResult,
} from "@/services/sharing-service";

export const sharingKeys = {
  all: ["sharing"] as const,
  expenses: (budgetId: string) => [...sharingKeys.all, "expenses", budgetId] as const,
  settlement: (budgetId: string) => [...sharingKeys.all, "settlement", budgetId] as const,
  settlements: (budgetId: string) => [...sharingKeys.all, "settlements", budgetId] as const,
  participants: (budgetId: string) => [...sharingKeys.all, "participants", budgetId] as const,
  activity: (budgetId: string) => [...sharingKeys.all, "activity", budgetId] as const,
  comments: (expenseId: string) => [...sharingKeys.all, "comments", expenseId] as const,
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function useExpensesQuery(budgetId: string) {
  return useQuery({
    queryKey: sharingKeys.expenses(budgetId),
    queryFn: () => sharingService.listExpenses(budgetId),
  });
}

export function useAddExpenseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sharingService.addExpense,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sharingKeys.expenses(vars.budgetId) });
      qc.invalidateQueries({ queryKey: sharingKeys.settlement(vars.budgetId) });
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

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export function useSettlementQuery(budgetId: string) {
  return useQuery({
    queryKey: sharingKeys.settlement(budgetId),
    queryFn: () => sharingService.calculateSettlement(budgetId),
  });
}

export function useSettlementsQuery(budgetId: string) {
  return useQuery<SettlementConfirmation[]>({
    queryKey: sharingKeys.settlements(budgetId),
    queryFn: () => sharingService.listSettlements(budgetId),
  });
}

export function useMarkSettledMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      budgetId: string;
      fromParticipantId: string;
      toParticipantId: string;
      amount: number;
      settledAt: string;
      note?: string;
    }) => sharingService.markSettled(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sharingKeys.settlements(vars.budgetId) });
      qc.invalidateQueries({ queryKey: sharingKeys.settlement(vars.budgetId) });
      qc.invalidateQueries({ queryKey: sharingKeys.activity(vars.budgetId) });
    },
  });
}

export function useDeleteSettlementMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sharingService.deleteSettlement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export function useParticipantsQuery(budgetId: string) {
  return useQuery<ParticipantInfo[]>({
    queryKey: sharingKeys.participants(budgetId),
    queryFn: () => sharingService.listParticipants(budgetId),
  });
}

export function useRevokeParticipantMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, participantId }: { budgetId: string; participantId: string }) =>
      sharingService.revokeParticipant(budgetId, participantId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sharingKeys.participants(vars.budgetId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function useActivityQuery(input: { budgetId: string; since?: number; limit?: number }) {
  return useQuery<ActivityLogEntry[]>({
    queryKey: sharingKeys.activity(input.budgetId),
    queryFn: () => sharingService.listActivity(input),
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function useCommentsQuery(expenseId: string) {
  return useQuery<ExpenseComment[]>({
    queryKey: sharingKeys.comments(expenseId),
    queryFn: () => sharingService.listComments(expenseId),
  });
}

export function useAddCommentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, body }: { expenseId: string; body: string }) =>
      sharingService.addComment(expenseId, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sharingKeys.comments(vars.expenseId) });
    },
  });
}

export function useDeleteCommentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sharingService.deleteComment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Guest join
// ---------------------------------------------------------------------------

export function usePreviewJoinLinkMutation() {
  return useMutation<JoinLinkPreview, Error, string>({
    mutationFn: (token: string) => sharingService.previewJoinLink(token),
  });
}

export function useJoinAsGuestMutation() {
  return useMutation<JoinAsGuestResult, Error, { token: string; displayName: string }>({
    mutationFn: ({ token, displayName }) => sharingService.joinAsGuest(token, displayName),
  });
}
