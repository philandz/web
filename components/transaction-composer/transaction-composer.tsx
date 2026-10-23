"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { TransferForm } from "@/components/philand/transfer-dialog";
import { isFeatureEnabled } from "@/lib/features";
import {
  pickDefaultCategory,
  readLastCategory,
  writeLastCategory,
} from "@/lib/transactions/composer-defaults";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useCreateTransactionMutation } from "@/modules/transaction/hooks";

type Mode = "expense" | "income" | "transfer";

interface TransactionComposerProps {
  budgetId: string;
  currency: string;
  /** hides the floating button / N shortcut for viewers */
  canWrite?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One entry point for adding money movements: Expense | Income | Transfer.
 * Opens from the floating button (mobile) or the N key (desktop).
 */
export function TransactionComposer({ budgetId, currency, canWrite = true }: TransactionComposerProps) {
  const t = useTranslations("budget.composer");
  const toast = useToast();
  const transfersOn = isFeatureEnabled("transfers");
  const { data: categories = [] } = useCategoriesQuery(budgetId);
  const create = useCreateTransactionMutation();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());

  useEffect(() => {
    if (!canWrite) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canWrite]);

  // Smart default: the category used last time for this type in this budget.
  useEffect(() => {
    if (!open || mode === "transfer") return;
    setCategoryId(pickDefaultCategory(categories, mode, readLastCategory(budgetId, mode)));
  }, [open, mode, categories, budgetId]);

  function close() {
    setOpen(false);
    setMode("expense");
    setAmount("");
    setDescription("");
    setCategoryId("");
    setDate(today());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (mode === "transfer" || !(value > 0)) return;
    create.mutate(
      {
        budgetId,
        type: mode,
        amount: value,
        description: description.trim(),
        date,
        categoryId: categoryId || undefined,
      },
      {
        onSuccess: () => {
          writeLastCategory(budgetId, mode, categoryId);
          toast.success(t("success"));
          close();
        },
        onError: () => toast.error(t("error")),
      },
    );
  }

  if (!canWrite) return null;

  const options = [
    { value: "expense", label: t("expense") },
    { value: "income", label: t("income") },
    ...(transfersOn ? [{ value: "transfer", label: t("transfer") }] : []),
  ];
  const visibleCategories = categories.filter((c) => c.type === mode && !c.archived);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
        aria-label={t("open")}
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <SegmentedControl
            options={options}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
          />

          {mode === "transfer" ? (
            <TransferForm open={open} sourceBudgetId={budgetId} onDone={close} onCancel={close} />
          ) : (
            <form onSubmit={submit} className="space-y-4 py-1" data-testid="composer-form">
              <AmountInput value={amount} onChange={setAmount} currency={currency} className="py-2" />
              <div className="space-y-1.5">
                <Label htmlFor="composer-desc">{t("description")}</Label>
                <Input
                  id="composer-desc"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("category")}</Label>
                  <SelectNative value={categoryId} onValueChange={setCategoryId}>
                    <option value="">{t("noCategory")}</option>
                    {visibleCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="composer-date">{t("date")}</Label>
                  <Input id="composer-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={create.isPending || !(Number(amount) > 0)}>
                  {create.isPending ? t("saving") : t("save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
