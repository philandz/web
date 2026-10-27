import type { LucideIcon } from "lucide-react";
import { BarChart2, CreditCard, LayoutGrid, PiggyBank, Share2 } from "lucide-react";
import type { BudgetType } from "@/services/budget-service";

/**
 * Single source of truth for per-budget-type visuals (plan T0.5). Class strings are
 * written out in full so Tailwind can see them.
 */
export interface BudgetTypeMeta {
  /** Legacy English name — kept for the detail screens that are not i18n-ready yet. */
  label: string;
  /** i18n key of the friendly type name, e.g. "budget.list.typeSaving". */
  labelKey: string;
  Icon: LucideIcon;
  emoji: string;
  /** icon tile: background + foreground */
  iconBg: string;
  /** pill/badge classes */
  badge: string;
  /** top stripe background */
  stripe: string;
  /** raw colours for inline styles */
  hex: { stripe: string; iconBg: string; iconFg: string };
}

export const BUDGET_TYPE_META: Record<BudgetType, BudgetTypeMeta> = {
  standard: {
    label: "Standard", labelKey: "budget.list.typeStandard", Icon: LayoutGrid, emoji: "⊞",
    iconBg: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    badge: "border-sky-200 bg-sky-500/10 text-sky-600 dark:border-sky-800 dark:text-sky-400",
    stripe: "bg-sky-500",
    hex: { stripe: "#38bdf8", iconBg: "#e0f2fe", iconFg: "#0369a1" },
  },
  saving: {
    label: "Saving", labelKey: "budget.list.typeSaving", Icon: PiggyBank, emoji: "🐷",
    iconBg: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400",
    stripe: "bg-emerald-500",
    hex: { stripe: "#22c984", iconBg: "#dcfce7", iconFg: "#15803d" },
  },
  debt: {
    label: "Debt", labelKey: "budget.list.typeDebt", Icon: CreditCard, emoji: "💳",
    iconBg: "bg-red-500/12 text-red-600 dark:text-red-400",
    badge: "border-red-200 bg-red-500/10 text-red-600 dark:border-red-800 dark:text-red-400",
    stripe: "bg-red-500",
    hex: { stripe: "#f05c6e", iconBg: "#fee2e2", iconFg: "#b91c1c" },
  },
  invest: {
    label: "Invest", labelKey: "budget.list.typeInvest", Icon: BarChart2, emoji: "📈",
    iconBg: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    badge: "border-violet-200 bg-violet-500/10 text-violet-600 dark:border-violet-800 dark:text-violet-400",
    stripe: "bg-violet-500",
    hex: { stripe: "#9d74f5", iconBg: "#ede9fe", iconFg: "#6d28d9" },
  },
  sharing: {
    label: "Sharing", labelKey: "budget.list.typeSharing", Icon: Share2, emoji: "🤝",
    iconBg: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    badge: "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-800 dark:text-amber-400",
    stripe: "bg-amber-500",
    hex: { stripe: "#f59e0b", iconBg: "#fef3c7", iconFg: "#b45309" },
  },
};

export function budgetTypeMeta(type: BudgetType | string | undefined): BudgetTypeMeta {
  return BUDGET_TYPE_META[type as BudgetType] ?? BUDGET_TYPE_META.standard;
}
