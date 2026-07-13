"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sharingService } from "@/services/sharing-service";
import { budgetService } from "@/services/budget-service";
import { apiClient } from "@/lib/http/client";
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
  budget: (budgetId: string) => [...sharingKeys.all, "budget", budgetId] as const,
  orgMembers: (orgId: string) => [...sharingKeys.all, "orgMembers", orgId] as const,
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function useExpensesQuery(budgetId: string) {
  return useQuery({
    queryKey: sharingKeys.expenses(budgetId),
    queryFn: () => sharingService.listExpenses(budgetId),
    enabled: Boolean(budgetId),
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
    enabled: Boolean(budgetId),
  });
}

export function useSettlementsQuery(budgetId: string) {
  return useQuery<SettlementConfirmation[]>({
    queryKey: sharingKeys.settlements(budgetId),
    queryFn: () => sharingService.listSettlements(budgetId),
    enabled: Boolean(budgetId),
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
    enabled: Boolean(budgetId),
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
// Budget + org lookup (for batch identity resolution)
// ---------------------------------------------------------------------------

/**
 * Lightweight `GET /budgets/{id}` wrapper used to grab the
 * `org_id` of a sharing budget. The sharing service doesn't expose
 * the orgId on its own responses, so we read it from the budget
 * service. One call per page-load, cached by `useQuery`.
 */
export function useBudgetOrgId(budgetId: string | null | undefined): string | undefined {
  return useQuery({
    queryKey: budgetId ? sharingKeys.budget(budgetId) : ["sharing", "budget", "_"],
    queryFn: () => budgetService.getBudget(budgetId!),
    enabled: Boolean(budgetId),
    select: (b) => b.orgId,
    staleTime: 5 * 60_000,
  }).data;
}

/**
 * Batch-fetch every member of `orgId` from the identity service and
 * return a `userId → displayName` map. Used as the last-resort
 * fallback when `useParticipantNameLookup` cannot resolve a
 * `user_id` (e.g. a leg whose author never went through
 * `assert_member` and therefore has no `sharing_participants` row).
 */
export function useBatchIdentityNames(
  orgId: string | null | undefined,
): Map<string, string> {
  const q = useQuery({
    queryKey: orgId ? sharingKeys.orgMembers(orgId) : ["sharing", "orgMembers", "_"],
    queryFn: async () => {
      // Catch "expected" failures (401/403/404) and return an empty
      // map so React Query doesn't log them as errors. The caller
      // already has the participants list as the primary source; this
      // hook is a best-effort enrichment, and if the caller isn't an
      // org member (e.g. they were added to a budget directly, or
      // they're a super-admin without an org), the lookup is silently
      // empty and the UI falls back to the participants / "—"
      // labels.
      try {
        const res = await apiClient.get<{
          members: { user_id: string; display_name: string; email: string }[];
        }>(`/api/identity/organizations/${orgId}/members`);
        const map = new Map<string, string>();
        for (const m of res.members ?? []) {
          if (m.user_id && m.display_name) {
            map.set(m.user_id, m.display_name);
          }
        }
        return map;
      } catch (err) {
        const e = err as { status?: number };
        if (typeof e?.status === "number" && e.status >= 400 && e.status < 500) {
          return EMPTY_MAP;
        }
        throw err;
      }
    },
    enabled: Boolean(orgId),
    staleTime: 5 * 60_000,
  });
  return q.data ?? EMPTY_MAP;
}

const EMPTY_MAP: Map<string, string> = new Map();

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function useActivityQuery(input: { budgetId: string; since?: number; limit?: number }) {
  return useQuery<ActivityLogEntry[]>({
    queryKey: sharingKeys.activity(input.budgetId),
    queryFn: () => sharingService.listActivity(input),
    enabled: Boolean(input.budgetId),
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function useCommentsQuery(expenseId: string | undefined) {
  return useQuery<ExpenseComment[]>({
    queryKey: sharingKeys.comments(expenseId ?? ""),
    queryFn: () => sharingService.listComments(expenseId!),
    enabled: Boolean(expenseId),
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

// Owner/Manager calls this to mint a fresh join link. Each call
// produces a new token; the link expiry is set on the backend.
export function useGenerateJoinLinkMutation() {
  return useMutation<{ token: string; joinUrl: string; expiresAt: number }, Error, string>({
    mutationFn: (budgetId: string) => sharingService.generateJoinLink(budgetId),
  });
}

export function useJoinAsGuestMutation() {
  return useMutation<JoinAsGuestResult, Error, { token: string; displayName: string }>({
    mutationFn: ({ token, displayName }) => sharingService.joinAsGuest(token, displayName),
  });
}

// `useAcceptJoinLinkMutation` is the authenticated-member path: the caller
// already has a JWT and only needs to bind a chosen display name to their
// existing user on the new sharing budget. The mutation passes the JWT
// through the gateway; the backend upserts a member participant row.
export function useAcceptJoinLinkMutation() {
  const qc = useQueryClient();
  return useMutation<{ budgetId: string }, Error, { token: string; displayName: string }>({
    mutationFn: async ({ token, displayName }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sharing/join-link/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, display_name: displayName }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`accept failed: ${res.status} ${body}`);
      }
      const data = (await res.json()) as { budget_id: string };
      return { budgetId: data.budget_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sharingKeys.participants(data.budgetId) });
    },
  });
}

// `useCurrentParticipantQuery` returns the participant record for the
// caller in the given budget. The backend's `listParticipants` does not
// expose the underlying user_id for members, so we match by display name
// (case-insensitive). Pass `kind` to disambiguate "member me" from
// "guest me" when the same display name could be either.
export function useCurrentParticipantQuery(
  budgetId: string,
  selfDisplayName: string | undefined,
  kind: "MEMBER" | "GUEST" = "MEMBER"
) {
  return useQuery<ParticipantInfo | null>({
    queryKey: [...sharingKeys.participants(budgetId), "self", kind, selfDisplayName ?? ""] as const,
    queryFn: async () => {
      const all = await sharingService.listParticipants(budgetId);
      const target = selfDisplayName?.toLowerCase();
      if (!target) return null;
      return (
        all.find(
          (p) =>
            p.displayName.toLowerCase() === target &&
            ((kind === "MEMBER" && p.kind === "MEMBER") ||
              (kind === "GUEST" && p.kind === "GUEST"))
        ) ?? null
      );
    },
    enabled: Boolean(budgetId && selfDisplayName),
  });
}
