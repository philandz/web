"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { useCreateTransactionMutation } from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import type { TransactionType } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

interface QuickEntryButtonProps {
  budgetId: string;
  currency?: string;
}

export function QuickEntryButton({ budgetId, currency = "VND" }: QuickEntryButtonProps) {
  const t = useTranslations("budget.quickEntry");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const createMutation = useCreateTransactionMutation();
  const { data: categories = [] } = useCategoriesQuery(budgetId);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Keyboard shortcut: N to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function reset() {
    setType("expense");
    setAmount("");
    setDescription("");
    setCategoryId("");
  }

  function handleClose() {
    reset();
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number.parseFloat(amount.replace(/,/g, ""));
    if (!parsedAmount || parsedAmount <= 0) return;

    createMutation.mutate(
      {
        budgetId,
        type,
        amount: parsedAmount,
        description: description.trim(),
        date: new Date().toISOString().slice(0, 10),
        categoryId: categoryId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          handleClose();
        },
        onError: () => toast.error(t("error")),
      }
    );
  }

  const filteredCategories = categories.filter((c) => c.type === type && !c.archived);

  return (
    <>
      {/* Floating button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
        aria-label={t("title")}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Quick entry dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t("title")}
              <span className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
                N
              </span>
            </DialogTitle>
          </DialogHeader>

          <form id="quick-entry-form" onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* Type toggle */}
            <div className="flex gap-2">
              {(["expense", "income"] as TransactionType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setType(v); setCategoryId(""); }}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                    type === v
                      ? v === "expense"
                        ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(v)}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>{t("amount")}</Label>
              <Input
                required
                autoFocus
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-lg font-semibold tabular-nums"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t("description")}</Label>
              <Input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>{t("category")}</Label>
              <SelectNative value={categoryId} onValueChange={setCategoryId}>
                <option value="">{t("noCategory")}</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </SelectNative>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>{t("cancel")}</Button>
            <Button type="submit" form="quick-entry-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
