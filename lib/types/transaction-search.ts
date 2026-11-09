export interface TransactionDraft {
  q: string;
  type: "all" | "expense" | "income" | "transfer";
  categoryIds: string[];
  /** Entry creators (created_by). */
  memberIds: string[];
  /** Range token (see lib/date-range): "period:0", "month:-1", "all", or "custom" for explicit dates. */
  range: string;
  /** Inclusive local dates, resolved from `range`. Empty = open. */
  dateFrom: string;
  dateTo: string;
  amountMin?: number;
  amountMax?: number;
  sortBy: "date" | "amount" | "description";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export type TransactionApplied = TransactionDraft;
