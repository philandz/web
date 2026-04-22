"use client";

import { useTranslations } from "next-intl";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTransactionsQuery } from "@/modules/transaction/hooks";
import type { Category } from "@/services/category-service";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

interface CategoryDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  budgetId: string;
}

export function CategoryDetailDrawer({ open, onClose, category, budgetId }: CategoryDetailDrawerProps) {
  const t = useTranslations("budget.catDetail");
  const { data } = useTransactionsQuery(
    category ? { budgetId, categoryId: category.id, pageSize: 20 } : {}
  );
  const transactions = data?.items ?? [];

  if (!category) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            <span className="mr-2">{category.icon}</span>{category.name}
          </SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("planned")}</p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {category.plannedAmount ? formatCurrency(category.plannedAmount) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{t("actual")}</p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {formatCurrency(category.actualSpend)}
              </p>
            </div>
          </div>

          {/* Usage bar */}
          {category.plannedAmount ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("usage")}</span>
                <span>{Math.round(category.usagePct)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${category.usagePct >= 100 ? "bg-red-500" : category.usagePct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, category.usagePct)}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Recent transactions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("recentTransactions")}</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
            ) : (
              <div className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <p className={`ml-3 shrink-0 text-sm font-semibold ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
