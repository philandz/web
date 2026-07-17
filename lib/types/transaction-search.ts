export interface TransactionDraft {
  q: string;
  type: "all" | "expense" | "income";
  categoryIds: string[];
  memberIds: string[];
  dateFrom: string;
  dateTo: string;
  sortBy: "date" | "amount" | "description";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export type TransactionApplied = TransactionDraft;
