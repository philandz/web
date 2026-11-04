import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { debtKeys, budgetKeys } from "@/lib/query-keys";
import {
  debtService,
  type CreateDebtAccountBody,
  type PrepayRule,
  type QuoteBody,
  type RatePeriod,
  type RecordPaymentBody,
  type UpdateDebtAccountBody,
} from "@/services/debt-service";

export function useDebtSummaryQuery(budgetId: string | null) {
  return useQuery({
    queryKey: debtKeys.summary(budgetId ?? ""),
    queryFn: () => debtService.summary(budgetId!),
    enabled: Boolean(budgetId),
  });
}

export function useDebtAccountsQuery(budgetId: string | null) {
  return useQuery({
    queryKey: debtKeys.accounts(budgetId ?? ""),
    queryFn: () => debtService.listAccounts(budgetId!, true),
    enabled: Boolean(budgetId),
  });
}

export function useDebtScheduleQuery(budgetId: string | null, accountId: string | null) {
  return useQuery({
    queryKey: debtKeys.schedule(budgetId ?? "", accountId ?? ""),
    queryFn: () => debtService.schedule(budgetId!, accountId!),
    enabled: Boolean(budgetId) && Boolean(accountId),
  });
}

export function useDebtPaymentsQuery(budgetId: string | null, accountId = "") {
  return useQuery({
    queryKey: debtKeys.payments(budgetId ?? "", accountId),
    queryFn: () => debtService.listPayments(budgetId!, accountId),
    enabled: Boolean(budgetId),
  });
}

export function useDebtEventsQuery(budgetId: string | null, accountId = "") {
  return useQuery({
    queryKey: debtKeys.events(budgetId ?? "", accountId),
    queryFn: () => debtService.listEvents(budgetId!, accountId),
    enabled: Boolean(budgetId),
  });
}

/** Everything a debt change can touch: the book, and the Standard budget that paid. */
function useInvalidateDebt(budgetId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: debtKeys.book(budgetId) });
    void qc.invalidateQueries({ queryKey: budgetKeys.all });
    void qc.invalidateQueries({ queryKey: ["entries"] });
  };
}

export function useCreateDebtAccount(budgetId: string) {
  const done = useInvalidateDebt(budgetId);
  return useMutation({
    mutationFn: (body: CreateDebtAccountBody) => debtService.createAccount(budgetId, body),
    onSuccess: done,
  });
}

export function useUpdateDebtAccount(budgetId: string, accountId: string) {
  const done = useInvalidateDebt(budgetId);
  return useMutation({
    mutationFn: (body: UpdateDebtAccountBody) => debtService.updateAccount(budgetId, accountId, body),
    onSuccess: done,
  });
}

export function useDebtLifecycle(budgetId: string, accountId: string) {
  const done = useInvalidateDebt(budgetId);
  const opts = { onSuccess: done };
  return {
    close: useMutation({ mutationFn: () => debtService.closeAccount(budgetId, accountId), ...opts }),
    reopen: useMutation({ mutationFn: () => debtService.reopenAccount(budgetId, accountId), ...opts }),
    settle: useMutation({ mutationFn: () => debtService.settleAccount(budgetId, accountId), ...opts }),
  };
}

export function useDebtTerms(budgetId: string, accountId: string) {
  const done = useInvalidateDebt(budgetId);
  const opts = { onSuccess: done };
  return {
    setRate: useMutation({ mutationFn: (r: RatePeriod) => debtService.setRate(budgetId, accountId, r), ...opts }),
    deleteRate: useMutation({ mutationFn: (id: string) => debtService.deleteRate(budgetId, accountId, id), ...opts }),
    setRule: useMutation({ mutationFn: (r: PrepayRule) => debtService.setRule(budgetId, accountId, r), ...opts }),
    deleteRule: useMutation({ mutationFn: (id: string) => debtService.deleteRule(budgetId, accountId, id), ...opts }),
  };
}

export function useQuoteDebtPayment(budgetId: string, accountId: string) {
  return useMutation({ mutationFn: (body: QuoteBody) => debtService.quote(budgetId, accountId, body) });
}

export function useRecordDebtPayment(budgetId: string, accountId: string) {
  const done = useInvalidateDebt(budgetId);
  return useMutation({
    mutationFn: (body: RecordPaymentBody) => debtService.recordPayment(budgetId, accountId, body),
    onSuccess: done,
  });
}

export function useAdjustDebt(budgetId: string, accountId: string) {
  const done = useInvalidateDebt(budgetId);
  return useMutation({
    mutationFn: (body: { newOutstandingMinor: number; reason: string; occurredOn?: string; idempotencyKey: string }) =>
      debtService.adjust(budgetId, accountId, body),
    onSuccess: done,
  });
}
