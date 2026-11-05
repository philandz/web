import type { BudgetType } from "@/services/budget-service";

const ALL_CURRENCIES = ["VND", "USD", "EUR"] as const;

/** Sharing budgets are VND-only until FX exists (enforced server-side too). */
export function currencyOptionsFor(type: BudgetType): readonly string[] {
  return type === "sharing" ? ["VND"] : ALL_CURRENCIES;
}

export function coerceCurrency(type: BudgetType, currency: string): string {
  const opts = currencyOptionsFor(type);
  return opts.includes(currency) ? currency : opts[0];
}

/** Order shown on the type picker; debt stays creatable but is not promoted. */
export const WIZARD_TYPES: BudgetType[] = ["standard", "saving", "sharing", "invest", "debt"];
