/**
 * Feature flags for the budget refactor (plan §9). Flags are read from
 * NEXT_PUBLIC_FEATURE_* at build time; unset means off. Keep the list small and
 * remove a flag once its release is stable.
 */
export type FeatureFlag =
  | "transfers"
  | "savingFund"
  | "periodPlanning"
  | "sharingV2"
  | "debtV2"
  | "uiRefresh";

// Literal `process.env.X` accesses are required so Next can inline them.
const RAW: Record<FeatureFlag, string | undefined> = {
  transfers: process.env.NEXT_PUBLIC_FEATURE_TRANSFERS,
  savingFund: process.env.NEXT_PUBLIC_FEATURE_SAVING_FUND,
  periodPlanning: process.env.NEXT_PUBLIC_FEATURE_PERIOD_PLANNING,
  sharingV2: process.env.NEXT_PUBLIC_FEATURE_SHARING_V2,
  debtV2: process.env.NEXT_PUBLIC_FEATURE_DEBT_V2,
  uiRefresh: process.env.NEXT_PUBLIC_FEATURE_UI_REFRESH,
};

export function parseFlag(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return parseFlag(RAW[flag]);
}
