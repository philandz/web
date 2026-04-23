"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { useBulkImportMutation } from "@/modules/transaction/hooks";
import type { BulkImportRow } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  return text.trim().split("\n").map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

const REQUIRED_COLS = ["date", "amount", "type"] as const;
const OPTIONAL_COLS = ["description", "category_id", "tags", "notes"] as const;
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS] as const;
type ColKey = (typeof ALL_COLS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "map" | "preview" | "done";

interface BulkImportDrawerProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
}

export function BulkImportDrawer({ open, onClose, budgetId }: BulkImportDrawerProps) {
  const t = useTranslations("budget.bulkImport");
  const toast = useToast();
  const mutation = useBulkImportMutation(budgetId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ColKey, number>>>({});
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function reset() {
    setStep("upload"); setHeaders([]); setRows([]); setMapping({}); setResult(null);
  }

  function handleClose() { reset(); onClose(); }

  function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { toast.error(t("emptyFile")); return; }
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      // Auto-map obvious column names
      const autoMap: Partial<Record<ColKey, number>> = {};
      parsed[0].forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes("date"))        autoMap.date = i;
        else if (lower.includes("amount")) autoMap.amount = i;
        else if (lower.includes("type") || lower.includes("kind")) autoMap.type = i;
        else if (lower.includes("desc"))   autoMap.description = i;
        else if (lower.includes("cat"))    autoMap.category_id = i;
        else if (lower.includes("tag"))    autoMap.tags = i;
        else if (lower.includes("note"))   autoMap.notes = i;
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) processFile(file);
    else toast.error(t("csvOnly"));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function buildImportRows(): BulkImportRow[] {
    return rows.map((row) => ({
      entry_date: mapping.date != null ? row[mapping.date] : "",
      amount: mapping.amount != null ? Math.round(parseFloat(row[mapping.amount].replace(/,/g, "")) || 0) : 0,
      kind: mapping.type != null
        ? (row[mapping.type].toLowerCase().includes("income") ? 2 : 1)
        : 1,
      description: mapping.description != null ? row[mapping.description] : "",
      category_id: mapping.category_id != null ? row[mapping.category_id] : "",
      tags: mapping.tags != null ? row[mapping.tags].split(";").map((s) => s.trim()).filter(Boolean) : [],
      notes: mapping.notes != null ? row[mapping.notes] : "",
    }));
  }

  const previewRows = buildImportRows().slice(0, 5);
  const validCount = buildImportRows().filter((r) => r.entry_date && r.amount > 0).length;
  const invalidCount = rows.length - validCount;

  function handleImport() {
    const importRows = buildImportRows();
    mutation.mutate(importRows, {
      onSuccess: (data) => {
        setResult({ imported: data.importedCount, errors: data.errorCount });
        setStep("done");
        if (data.importedCount > 0) toast.success(t("importSuccess", { count: data.importedCount }));
        if (data.errorCount > 0) toast.error(t("importErrors", { count: data.errorCount }));
      },
      onError: () => toast.error(t("importFailed")),
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetClose onClose={handleClose} />
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t("dropHere")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("csvOnly")}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />{t("browse")}
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("mapHint", { rows: rows.length })}</p>
              <div className="space-y-3">
                {ALL_COLS.map((col) => (
                  <div key={col} className="flex items-center gap-3">
                    <span className={cn("w-28 shrink-0 text-sm font-medium", REQUIRED_COLS.includes(col as typeof REQUIRED_COLS[number]) ? "text-foreground" : "text-muted-foreground")}>
                      {t(`col_${col}`)}
                      {REQUIRED_COLS.includes(col as typeof REQUIRED_COLS[number]) && <span className="ml-1 text-red-500">*</span>}
                    </span>
                    <SelectNative
                      value={mapping[col] != null ? String(mapping[col]) : ""}
                      onValueChange={(v) => setMapping((p) => ({ ...p, [col]: v ? parseInt(v) : undefined }))}
                      className="flex-1"
                    >
                      <option value="">{t("notMapped")}</option>
                      {headers.map((h, i) => (
                        <option key={i} value={String(i)}>{h}</option>
                      ))}
                    </SelectNative>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />{validCount} {t("valid")}
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <AlertCircle className="h-4 w-4" />{invalidCount} {t("invalid")}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("col_date")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("col_amount")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("col_type")}</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("col_description")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {previewRows.map((r, i) => {
                      const isValid = r.entry_date && r.amount > 0;
                      return (
                        <tr key={i} className={cn(!isValid && "bg-red-500/5")}>
                          <td className="px-3 py-2">{r.entry_date || <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-2">{r.amount > 0 ? r.amount.toLocaleString() : <span className="text-red-500">—</span>}</td>
                          <td className="px-3 py-2 capitalize">{r.kind === 2 ? "income" : "expense"}</td>
                          <td className="px-3 py-2 truncate max-w-[120px]">{r.description || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="text-xs text-muted-foreground">+{rows.length - 5} {t("moreRows")}</p>
              )}
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && result && (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
              <p className="text-base font-semibold text-foreground">{t("doneTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("doneDesc", { imported: result.imported, errors: result.errors })}
              </p>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>{t("cancel")}</Button>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>{t("back")}</Button>
              <Button
                disabled={!mapping.date || !mapping.amount || !mapping.type}
                onClick={() => setStep("preview")}
              >
                {t("preview")}
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>{t("back")}</Button>
              <Button disabled={validCount === 0 || mutation.isPending} onClick={handleImport}>
                {mutation.isPending ? t("importing") : t("importN", { count: validCount })}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>{t("close")}</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
