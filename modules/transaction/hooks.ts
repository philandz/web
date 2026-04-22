import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  transactionService,
  type TransactionListParams,
  type TransactionType,
} from "@/services/transaction-service";
import { mediaService } from "@/services/media-service";
import { transactionKeys } from "@/lib/query-keys";

export function useTransactionsQuery(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => transactionService.listTransactions(params),
    placeholderData: (prev) => prev,
  });
}

export function useTransactionQuery(transactionId: string | null) {
  return useQuery({
    queryKey: transactionKeys.detail(transactionId ?? ""),
    queryFn: () => transactionService.getTransaction(transactionId!),
    enabled: Boolean(transactionId),
  });
}

export function useCreateTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}

export function useUpdateTransactionMutation(transactionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type?: TransactionType;
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: string;
      tags?: string[];
      notes?: string;
    }) => transactionService.updateTransaction(transactionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.lists() });
      qc.invalidateQueries({ queryKey: transactionKeys.detail(transactionId) });
    },
  });
}

export function useDeleteTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      transactionService.deleteTransaction(transactionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}

export function useBulkTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "category"; ids: string[]; categoryId: string }
      | { kind: "tags"; ids: string[]; tags: string[] }
      | { kind: "delete"; ids: string[] }
    ) => {
      if (action.kind === "category") {
        return transactionService.bulkUpdateCategory(action.ids, action.categoryId);
      }
      if (action.kind === "tags") {
        return transactionService.bulkAddTags(action.ids, action.tags);
      }
      return transactionService.bulkDelete(action.ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}

export function useTransactionAttachmentsQuery(entryId: string | null) {
  return useQuery({
    queryKey: transactionKeys.attachments(entryId ?? ""),
    queryFn: async () => {
      const attachments = await transactionService.listAttachments(entryId!);
      return Promise.all(
        attachments.map(async (a) => ({
          ...a,
          downloadUrl: await mediaService.getFileUrl(a.fileId),
        }))
      );
    },
    enabled: Boolean(entryId),
  });
}

export function useAttachFileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, fileId, fileName }: { entryId: string; fileId: string; fileName: string }) =>
      transactionService.attachFile(entryId, fileId, fileName),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: transactionKeys.attachments(vars.entryId) });
      qc.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

export function useRemoveAttachmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId, entryId }: { attachmentId: string; entryId: string }) =>
      transactionService.removeAttachment(attachmentId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: transactionKeys.attachments(vars.entryId) });
      qc.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

export function useBulkImportMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: import("@/services/transaction-service").BulkImportRow[]) =>
      transactionService.bulkImportTransactions(budgetId, rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}

export function useCommentsQuery(entryId: string | null) {
  return useQuery({
    queryKey: transactionKeys.comments(entryId ?? ""),
    queryFn: () => transactionService.listComments(entryId!),
    enabled: Boolean(entryId),
  });
}

export function useAddCommentMutation(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => transactionService.addComment(entryId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.comments(entryId) }),
  });
}

export function useEditCommentMutation(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      transactionService.editComment(commentId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.comments(entryId) }),
  });
}

export function useDeleteCommentMutation(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => transactionService.deleteComment(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.comments(entryId) }),
  });
}

export function useCreateRecurringTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transactionService.createRecurringTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}

export function useCreateSplitTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transactionService.createSplitTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.lists() }),
  });
}
