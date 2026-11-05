import type { Category } from "@/services/category-service";

type SelectableCategory = Pick<Category, "id" | "type" | "archived">;

/** Last-used category for this type if it is still selectable, otherwise none. */
export function pickDefaultCategory(
  categories: SelectableCategory[],
  type: "income" | "expense",
  lastUsedId: string | null | undefined,
): string {
  if (!lastUsedId) return "";
  const ok = categories.some((c) => c.id === lastUsedId && c.type === type && !c.archived);
  return ok ? lastUsedId : "";
}

const key = (budgetId: string, type: string) => `composer:lastCategory:${budgetId}:${type}`;

export function readLastCategory(budgetId: string, type: string): string | null {
  try {
    return window.localStorage.getItem(key(budgetId, type));
  } catch {
    return null;
  }
}

export function writeLastCategory(budgetId: string, type: string, categoryId: string): void {
  try {
    if (categoryId) window.localStorage.setItem(key(budgetId, type), categoryId);
  } catch {
    /* storage unavailable: defaults simply won't be remembered */
  }
}
