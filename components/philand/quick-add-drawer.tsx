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
import { parseVnd } from "@/lib/money/parse-vnd";

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

/**
 * Amount typed in a cell. VND accepts the same shorthand as the main form
 * ("50k", "1tr5", "120.000"); other currencies take a plain number.
 */
export function parseRowAmount(raw: string, currency = "VND"): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (currency === "VND") return parseVnd(text);
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isRowValid(row: QuickAddRow, currency = "VND"): boolean {
  const amount = parseRowAmount(row.amount, currency);
  return row.date !== "" && amount !== null && amount > 0 && row.description.trim() !== "";
}

export function mapRow(row: QuickAddRow, currency = "VND"): BulkImportRow {
  return {
    entry_date: row.date,
    amount: Math.round(parseRowAmount(row.amount, currency) ?? 0),
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

  const validCount = rows.filter((r) => isRowValid(r, currency)).length;

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
    const payload = rows.filter((r) => isRowValid(r, currency)).map((r) => mapRow(r, currency));
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
      <SheetContent side="right" className="flex flex-col sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>

        <SheetBody className="flex-1 overflow-auto p-0">
          <p className="border-b border-border/40 px-4 py-2 text-xs text-muted-foreground">{t("hint")}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Column headers */}
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[136px]">
                    {t("colDate")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[100px]">
                    {t("colType")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[180px]">
                    {t("colDescription")}
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[150px]">
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
                  const valid = isRowValid(row, currency);
                  const touched = row.description.trim() !== "" || row.amount.trim() !== "";
                  return (
                    <tr
                      key={row.id}
                      className="group"
                      data-valid={valid}
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
                              ? "border-emerald-300 bg-emerald-500/15 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                              : "border-red-300 bg-red-500/15 text-red-700 dark:border-red-700 dark:text-red-400",
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
                          placeholder={t("descriptionPlaceholder")}
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                          type="text"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) =>
                            updateRow(row.id, { amount: e.target.value })
                          }
                          onBlur={() => {
                            // Show what was understood: "50k" becomes "50.000".
                            if (currency !== "VND") return;
                            const n = parseRowAmount(row.amount, currency);
                            if (n !== null) updateRow(row.id, { amount: n.toLocaleString("vi-VN") });
                          }}
                          onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                          placeholder={t("amountPlaceholder")}
                          aria-invalid={touched && row.amount.trim() !== "" && parseRowAmount(row.amount, currency) === null}
                          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-right text-xs tabular-nums text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 aria-[invalid=true]:border-destructive"
                        />
                      </td>

                      {/* Delete row */}
                      <td className="px-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                          aria-label={t("removeRow")}
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
