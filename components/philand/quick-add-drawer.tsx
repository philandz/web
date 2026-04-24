"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetBody, SheetClose, SheetContent,
  SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/state/toast-provider";
import { useBulkImportMutation } from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import type { BulkImportRow } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuickAddRow {
  id: string;
  date: string;
  type: "income" | "expense";
  description: string;
  categoryId: string;
  amount: string;
}

interface QuickAddDrawerProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  currency?: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for testability)
// ---------------------------------------------------------------------------

export function makeEmptyRow(): QuickAddRow {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    description: "",
    categoryId: "",
    amount: "",
  };
}

export function isRowValid(row: QuickAddRow): boolean {
  return (
    row.date !== "" &&
    Number.parseFloat(row.amount) > 0 &&
    row.description.trim() !== ""
  );
}

export function mapRow(row: QuickAddRow): BulkImportRow {
  return {
    entry_date: row.date,
    amount: Math.round(Number.parseFloat(row.amount)),
    kind: row.type === "income" ? 2 : 1,
    description: row.description,
    category_id: row.categoryId || undefined,
    tags: [],
    notes: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAddDrawer({
  open,
  onClose,
  budgetId,
  currency = "VND",
}: QuickAddDrawerProps) {
  const t = useTranslations("budget.quickAdd");
  const toast = useToast();
  const mutation = useBulkImportMutation(budgetId);
  const { data: categories = [] } = useCategoriesQuery(budgetId);

  const [rows, setRows] = useState<QuickAddRow[]>(() =>
    Array.from({ length: 5 }, makeEmptyRow)
  );

  // Reset to 5 empty rows each time the drawer opens
  useEffect(() => {
    if (open) {
      setRows(Array.from({ length: 5 }, makeEmptyRow));
    }
  }, [open]);

  const validCount = rows.filter(isRowValid).length;

  // ---------------------------------------------------------------------------
  // Row mutation helpers
  // ---------------------------------------------------------------------------

  function updateRow(id: string, patch: Partial<QuickAddRow>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, makeEmptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [makeEmptyRow()] : next;
    });
  }

  function clearAll() {
    setRows(Array.from({ length: 5 }, makeEmptyRow));
  }

  // Tab on last amount cell → append new row
  function handleAmountKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number
  ) {
    if (e.key === "Tab" && !e.shiftKey && rowIndex === rows.length - 1) {
      e.preventDefault();
      addRow();
    }
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  function handleSave() {
    const payload = rows.filter(isRowValid).map(mapRow);
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(t("saveSuccess"));
        onClose();
      },
      onError: () => {
        toast.error(t("saveError"));
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>

        <SheetBody className="flex-1 overflow-auto p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Column headers */}
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[120px]">
                    {t("colDate")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[100px]">
                    {t("colType")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("colDescription")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[140px]">
                    {t("colCategory")}
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[120px]">
                    {t("colAmount")}
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>

              {/* Editable rows */}
              <tbody className="divide-y divide-border/30">
                {rows.map((row, idx) => {
                  const valid = isRowValid(row);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "group transition-opacity",
                        !valid && "opacity-40",
                      )}
                    >
                      {/* Date */}
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, { date: e.target.value })}
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </td>

                      {/* Type toggle chip */}
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(row.id, {
                              type: row.type === "expense" ? "income" : "expense",
                            })
                          }
                          className={cn(
                            "inline-flex w-full items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                            row.type === "income"
                              ? "border-emerald-300 bg-emerald-500/15 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                              : "border-red-300 bg-red-500/15 text-red-600 dark:border-red-700 dark:text-red-400",
                          )}
                        >
                          {row.type === "income" ? t("income") : t("expense")}
                        </button>
                      </td>

                      {/* Description */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            updateRow(row.id, { description: e.target.value })
                          }
                          placeholder="e.g. Grab lunch"
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-2 py-1.5">
                        <select
                          value={row.categoryId}
                          onChange={(e) =>
                            updateRow(row.id, { categoryId: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          <option value="">{t("noCategory")}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.amount}
                          onChange={(e) =>
                            updateRow(row.id, { amount: e.target.value })
                          }
                          onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                          placeholder="0"
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-right text-xs tabular-nums text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </td>

                      {/* Delete row */}
                      <td className="px-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add row button below table */}
          <div className="border-t border-border/40 px-3 py-2">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addRow")}
            </button>
          </div>
        </SheetBody>

        <SheetFooter className="border-t border-border/60 px-4 py-3">
          <div className="flex w-full items-center gap-3">
            {/* Valid count */}
            <span className="text-xs text-muted-foreground">
              {t("ready", { count: validCount })}
            </span>

            <div className="flex flex-1 items-center justify-end gap-2">
              {/* Clear all */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground"
              >
                {t("clearAll")}
              </Button>

              {/* Cancel */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                {t("cancel")}
              </Button>

              {/* Save */}
              <Button
                type="button"
                size="sm"
                disabled={validCount === 0 || mutation.isPending}
                onClick={handleSave}
              >
                {mutation.isPending
                  ? t("saving")
                  : t("saveN", { count: validCount })}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
