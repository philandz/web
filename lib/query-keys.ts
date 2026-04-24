// Centralized React Query key factories.
// All keys are typed as const arrays to enable precise cache invalidation.

export const budgetKeys = {
  all: ["budgets"] as const,
  lists: () => [...budgetKeys.all, "list"] as const,
  list: (params: object) => [...budgetKeys.lists(), params] as const,
  details: () => [...budgetKeys.all, "detail"] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  members: (budgetId: string) => [...budgetKeys.detail(budgetId), "members"] as const,
  envelope: (budgetId: string) => [...budgetKeys.detail(budgetId), "envelope"] as const,
  burnRate: (budgetId: string) => [...budgetKeys.detail(budgetId), "burn-rate"] as const,
  rollover: (budgetId: string) => [...budgetKeys.detail(budgetId), "rollover"] as const,
  templates: () => [...budgetKeys.all, "templates"] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  list: (budgetId: string) => [...categoryKeys.all, budgetId] as const,
};

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (params: object) => [...transactionKeys.lists(), params] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
  attachments: (entryId: string) => [...transactionKeys.all, "attachments", entryId] as const,
  comments: (entryId: string) => [...transactionKeys.all, "comments", entryId] as const,
};

export const investKeys = {
  all: ["invest"] as const,
  assets: (budgetId: string) => [...investKeys.all, budgetId, "assets"] as const,
  portfolio: (budgetId: string) => [...investKeys.all, budgetId, "portfolio"] as const,
  snapshots: (assetId: string) => [...investKeys.all, "snapshots", assetId] as const,
};
