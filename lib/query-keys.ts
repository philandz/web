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
  detail: (categoryId: string) => [...categoryKeys.all, "detail", categoryId] as const,
};

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (params: object) => [...transactionKeys.lists(), params] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
  attachments: (entryId: string) => [...transactionKeys.all, "attachments", entryId] as const,
  comments: (entryId: string) => [...transactionKeys.all, "comments", entryId] as const,
  summary: (budgetId: string) => [...transactionKeys.all, "summary", budgetId] as const,
};

export const investKeys = {
  all: ["invest"] as const,
  assets: (budgetId: string) => [...investKeys.all, budgetId, "assets"] as const,
  portfolio: (budgetId: string) => [...investKeys.all, budgetId, "portfolio"] as const,
  snapshots: (assetId: string) => [...investKeys.all, "snapshots", assetId] as const,
};

export const portfolioKeys = {
  all: ["portfolio"] as const,
  lists: () => [...portfolioKeys.all, "list"] as const,
  list: (params: { budgetId: string; source?: string }) =>
    [...portfolioKeys.lists(), params] as const,
  details: () => [...portfolioKeys.all, "detail"] as const,
  detail: (budgetId: string, assetId: string) =>
    [...portfolioKeys.details(), budgetId, assetId] as const,
  summary: (budgetId: string, source?: string) =>
    [...portfolioKeys.all, "summary", budgetId, source ?? "auto"] as const,
  observations: (budgetId: string, assetId: string) =>
    [...portfolioKeys.detail(budgetId, assetId), "observations"] as const,
  activity: (budgetId: string, assetId: string) =>
    [...portfolioKeys.detail(budgetId, assetId), "activity"] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  resend: () => [...settingsKeys.all, "resend"] as const,
};
