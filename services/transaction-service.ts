import { apiClient } from "@/lib/http/client";

const BASE = "/api/entry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  budgetId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  tags: string[];
  isRecurring: boolean;
  hasAttachment: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: number;
}

export interface TransactionListParams {
  budgetId?: string;
  budgetIds?: string[];
  q?: string;
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string;
  sortBy?: "date" | "amount" | "description";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}

export interface PagedTransactions {
  items: Transaction[];
  meta: PageMeta;
}

export interface BulkImportRow {
  entry_date: string;
  amount: number;
  kind?: number;   // 1=expense, 2=income
  description?: string;
  category_id?: string;
  tags?: string[];
  notes?: string;
}

export interface TransactionAttachment {
  id: string;
  entryId: string;
  fileId: string;
  fileName: string;
  createdBy: string;
  createdAt: number;
}

export interface TransactionComment {
  id: string;
  entryId: string;
  body: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface BulkImportResult {
  importedCount: number;
  errorCount: number;
  results: Array<{ rowIndex: number; success: boolean; error: string; entryId: string }>;
}

// ---------------------------------------------------------------------------
// Raw shapes — gateway returns flat objects
// ---------------------------------------------------------------------------

interface RawEntry {
  id: string;
  budget_id: string;
  category_id?: string;
  kind: number | string;   // 1=expense, 2=income
  amount: number;
  description: string;
  entry_date: string;
  tags?: string[];
  is_recurring?: boolean;
  has_attachment?: boolean;
  notes?: string;
  created_by?: string;
  created_at?: number;
}

interface RawMeta {
  page: number;
  page_size: number;
  total_pages: number;
  total_rows: number;
}

const KIND_MAP: Record<number, TransactionType> = { 1: "expense", 2: "income" };

function toKind(v: number | string): TransactionType {
  if (typeof v === "number") return KIND_MAP[v] ?? "expense";
  return (v as TransactionType) || "expense";
}

function mapEntry(raw: RawEntry): Transaction {
  return {
    id: raw.id,
    budgetId: raw.budget_id,
    categoryId: raw.category_id || undefined,
    type: toKind(raw.kind),
    amount: raw.amount,
    description: raw.description,
    date: raw.entry_date,
    tags: raw.tags ?? [],
    isRecurring: raw.is_recurring ?? false,
    hasAttachment: raw.has_attachment ?? false,
    notes: raw.notes || undefined,
    createdBy: raw.created_by,
    createdAt: raw.created_at ?? 0,
  };
}

function mapMeta(raw?: RawMeta): PageMeta {
  return {
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? 20,
    totalPages: raw?.total_pages ?? 1,
    totalRows: raw?.total_rows ?? 0,
  };
}

function buildQuery(params: TransactionListParams): string {
  const p = new URLSearchParams();
  if (params.budgetIds?.length) p.set("budget_ids", params.budgetIds.join(","));
  if (params.q)         p.set("q", params.q);
  if (params.type)      p.set("kind", params.type);
  if (params.categoryId) p.set("category_id", params.categoryId);
  if (params.dateFrom)  p.set("date_from", params.dateFrom);
  if (params.dateTo)    p.set("date_to", params.dateTo);
  if (params.amountMin != null) p.set("amount_min", String(params.amountMin));
  if (params.amountMax != null) p.set("amount_max", String(params.amountMax));
  if (params.tags)      p.set("tags", params.tags);
  if (params.sortBy)    p.set("sort_by", params.sortBy);
  if (params.sortDir)   p.set("sort_dir", params.sortDir);
  if (params.page)      p.set("page", String(params.page));
  if (params.pageSize)  p.set("page_size", String(params.pageSize));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const transactionService = {
  async listTransactions(params: TransactionListParams = {}): Promise<PagedTransactions> {
    const budgetId = params.budgetId;
    const qs = buildQuery(params);
    const url = budgetId
      ? `${BASE}/budgets/${budgetId}/entries${qs}`
      : `${BASE}/entries${qs}`;
    const raw = await apiClient.get<{ entries: RawEntry[]; meta: RawMeta }>(url);
    return { items: (raw.entries ?? []).map(mapEntry), meta: mapMeta(raw.meta) };
  },

  async getTransaction(transactionId: string): Promise<Transaction> {
    const raw = await apiClient.get<RawEntry>(`${BASE}/entries/${transactionId}`);
    return mapEntry(raw);
  },

  async createTransaction(input: {
    budgetId: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId?: string;
    tags?: string[];
    notes?: string;
  }): Promise<Transaction> {
    const raw = await apiClient.post<RawEntry>(`${BASE}/entries`, {
      budget_id: input.budgetId,
      kind: input.type === "income" ? 2 : 1,
      amount: input.amount,
      description: input.description,
      entry_date: input.date,
      category_id: input.categoryId ?? "",
      tags: input.tags ?? [],
      notes: input.notes ?? "",
    });
    return mapEntry(raw);
  },

  async updateTransaction(
    transactionId: string,
    input: {
      type?: TransactionType;
      amount?: number;
      description?: string;
      date?: string;
      categoryId?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<Transaction> {
    const raw = await apiClient.patch<RawEntry>(`${BASE}/entries/${transactionId}`, {
      kind: input.type ? (input.type === "income" ? 2 : 1) : undefined,
      amount: input.amount,
      description: input.description,
      entry_date: input.date,
      category_id: input.categoryId,
      tags: input.tags,
      notes: input.notes,
    });
    return mapEntry(raw);
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    await apiClient.request(`${BASE}/entries/${transactionId}`, { method: "DELETE" });
  },

  async bulkDelete(ids: string[]): Promise<void> {
    // Delete one by one — no bulk delete endpoint yet
    await Promise.all(ids.map((id) => transactionService.deleteTransaction(id)));
  },

  async bulkUpdateCategory(_ids: string[], _categoryId: string): Promise<void> {
    // Not yet implemented in entry service — no-op for now
  },

  async bulkAddTags(_ids: string[], _tags: string[]): Promise<void> {
    // Not yet implemented in entry service — no-op for now
  },

  async listAttachments(entryId: string): Promise<TransactionAttachment[]> {
    const raw = await apiClient.get<{ attachments: Array<{
      id: string; entry_id: string; file_id: string;
      file_name: string; created_by: string; created_at: number;
    }> }>(`${BASE}/entries/${entryId}/attachments`);
    return (raw.attachments ?? []).map((a) => ({
      id: a.id, entryId: a.entry_id, fileId: a.file_id,
      fileName: a.file_name, createdBy: a.created_by, createdAt: a.created_at,
    }));
  },

  async attachFile(entryId: string, fileId: string, fileName: string): Promise<TransactionAttachment> {
    const raw = await apiClient.post<{
      id: string; entry_id: string; file_id: string;
      file_name: string; created_by: string; created_at: number;
    }>(`${BASE}/entries/${entryId}/attachments`, { file_id: fileId, file_name: fileName });
    return {
      id: raw.id, entryId: raw.entry_id, fileId: raw.file_id,
      fileName: raw.file_name, createdBy: raw.created_by, createdAt: raw.created_at,
    };
  },

  async removeAttachment(attachmentId: string): Promise<void> {
    await apiClient.request(`${BASE}/attachments/${attachmentId}`, { method: "DELETE" });
  },

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  async listComments(entryId: string): Promise<TransactionComment[]> {
    const raw = await apiClient.get<{ comments: Array<{
      id: string; entry_id: string; body: string;
      created_by: string; created_at: number; updated_at: number;
    }> }>(`${BASE}/entries/${entryId}/comments`);
    return (raw.comments ?? []).map((c) => ({
      id: c.id, entryId: c.entry_id, body: c.body,
      createdBy: c.created_by, createdAt: c.created_at, updatedAt: c.updated_at,
    }));
  },

  async addComment(entryId: string, body: string): Promise<TransactionComment> {
    const raw = await apiClient.post<{
      id: string; entry_id: string; body: string;
      created_by: string; created_at: number; updated_at: number;
    }>(`${BASE}/entries/${entryId}/comments`, { body });
    return { id: raw.id, entryId: raw.entry_id, body: raw.body, createdBy: raw.created_by, createdAt: raw.created_at, updatedAt: raw.updated_at };
  },

  async editComment(commentId: string, body: string): Promise<TransactionComment> {
    const raw = await apiClient.patch<{
      id: string; entry_id: string; body: string;
      created_by: string; created_at: number; updated_at: number;
    }>(`${BASE}/comments/${commentId}`, { body });
    return { id: raw.id, entryId: raw.entry_id, body: raw.body, createdBy: raw.created_by, createdAt: raw.created_at, updatedAt: raw.updated_at };
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.request(`${BASE}/comments/${commentId}`, { method: "DELETE" });
  },

  // ---------------------------------------------------------------------------
  // Recurring
  // ---------------------------------------------------------------------------

  async createRecurringTransaction(input: {
    budgetId: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId?: string;
    tags?: string[];
    notes?: string;
    recurrenceRule: string;
  }): Promise<Transaction> {
    const raw = await apiClient.post<RawEntry>(`${BASE}/budgets/${input.budgetId}/entries/recurring`, {
      kind: input.type === "income" ? 2 : 1,
      amount: input.amount,
      description: input.description,
      entry_date: input.date,
      category_id: input.categoryId ?? "",
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      recurrence_rule: input.recurrenceRule,
    });
    return mapEntry(raw);
  },

  async createSplitTransaction(input: {
    budgetId: string;
    type: TransactionType;
    totalAmount: number;
    description: string;
    date: string;
    tags?: string[];
    notes?: string;
    legs: Array<{ budgetId: string; amount: number; description?: string; categoryId?: string }>;
  }): Promise<{ splitGroupId: string; legs: Transaction[] }> {
    const raw = await apiClient.post<{
      split_group_id: string;
      legs: RawEntry[];
    }>(`${BASE}/budgets/${input.budgetId}/entries/split`, {
      kind: input.type === "income" ? 2 : 1,
      total_amount: input.totalAmount,
      description: input.description,
      entry_date: input.date,
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      legs: input.legs.map((l) => ({
        budget_id: l.budgetId,
        amount: l.amount,
        description: l.description ?? input.description,
        category_id: l.categoryId ?? "",
      })),
    });
    return {
      splitGroupId: raw.split_group_id,
      legs: (raw.legs ?? []).map(mapEntry),
    };
  },

  async bulkImportTransactions(
    budgetId: string,
    rows: BulkImportRow[]
  ): Promise<BulkImportResult> {
    const raw = await apiClient.post<{
      imported_count: number;
      error_count: number;
      results: Array<{ row_index: number; success: boolean; error: string; entry_id: string }>;
    }>(`${BASE}/budgets/${budgetId}/entries/bulk-import`, { rows });
    return {
      importedCount: raw.imported_count,
      errorCount: raw.error_count,
      results: raw.results.map((r) => ({
        rowIndex: r.row_index,
        success: r.success,
        error: r.error,
        entryId: r.entry_id,
      })),
    };
  },
};
