"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Plus, RefreshCw, Split, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/state/toast-provider";
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useTransactionAttachmentsQuery,
  useCreateRecurringTransactionMutation,
  useCreateSplitTransactionMutation,
} from "@/modules/transaction/hooks";
import { useBudgetsQuery } from "@/modules/budget/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { mediaService } from "@/services/media-service";
import { transactionService } from "@/services/transaction-service";
import { transactionKeys } from "@/lib/query-keys";
import type { Transaction, TransactionAttachment, TransactionType } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ---------------------------------------------------------------------------
// Attachment picker
// ---------------------------------------------------------------------------

interface AttachmentPickerProps {
  existingAttachment: (TransactionAttachment & { downloadUrl: string }) | null;
  pendingFile: File | null;
  pendingPreview: string | null;
  onFileSelect: (file: File) => void;
  onRemovePending: () => void;
  onRemoveExisting: () => void;
  hint: string;
  addLabel: string;
  changeLabel: string;
  removeLabel: string;
}

function AttachmentPicker({
  existingAttachment,
  pendingFile,
  pendingPreview,
  onFileSelect,
  onRemovePending,
  onRemoveExisting,
  hint,
  addLabel,
  changeLabel,
  removeLabel,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return;
    if (file.size > MAX_FILE_SIZE) return;
    onFileSelect(file);
    // reset so same file can be re-selected
    e.target.value = "";
  }

  const hasImage = pendingFile || existingAttachment;

  return (
    <div className="space-y-2">
      {hasImage ? (
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted">
          <img
            src={pendingPreview ?? existingAttachment?.downloadUrl ?? ""}
            alt={pendingFile?.name ?? existingAttachment?.fileName ?? "attachment"}
            className="h-48 w-full object-cover"
          />
          {/* Overlay controls */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="truncate text-xs text-white/80">
              {pendingFile?.name ?? existingAttachment?.fileName}
            </span>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/30"
              >
                {changeLabel}
              </button>
              <button
                type="button"
                onClick={pendingFile ? onRemovePending : onRemoveExisting}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur hover:bg-white/30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
        >
          <ImageIcon className="h-4 w-4" />
          {addLabel}
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form drawer
// ---------------------------------------------------------------------------

interface TransactionFormDrawerProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  transaction?: Transaction;
  defaultType?: TransactionType;
  currency?: string;
}

export function TransactionFormDrawer({
  open,
  onClose,
  budgetId,
  transaction,
  defaultType = "expense",
  currency = "VND",
}: TransactionFormDrawerProps) {
  const t = useTranslations("budget.txForm");
  const toast = useToast();
  const qc = useQueryClient();
  const isEdit = Boolean(transaction);

  const createMutation = useCreateTransactionMutation();
  const updateMutation = useUpdateTransactionMutation(transaction?.id ?? "");
  const createRecurringMutation = useCreateRecurringTransactionMutation();
  const createSplitMutation = useCreateSplitTransactionMutation();
  const { data: categories = [] } = useCategoriesQuery(budgetId);
  const { data: existingAttachments = [] } = useTransactionAttachmentsQuery(
    isEdit && transaction?.hasAttachment ? transaction.id : null,
  );
  const tenant = useTenantContext();
  const { data: allBudgets = [] } = useBudgetsQuery({
    orgId: tenant.selectedOrgId ?? "",
    pageSize: 100,
  });

  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [tags, setTags] = useState(transaction?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring ?? false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");

  // Split state
  const [isSplit, setIsSplit] = useState(false);
  const [splitLegs, setSplitLegs] = useState<Array<{ id: string; budgetId: string; amount: string }>>([
    { id: crypto.randomUUID(), budgetId: "", amount: "" },
    { id: crypto.randomUUID(), budgetId: "", amount: "" },
  ]);

  // Attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrReviewOpen, setOcrReviewOpen] = useState(false);

  const existingAttachment = existingAttachments[0] ?? null;

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.description);
      setDate(transaction.date);
      setCategoryId(transaction.categoryId ?? "");
      setTags(transaction.tags.join(", "));
      setNotes(transaction.notes ?? "");
    } else {
      setType(defaultType);
      setAmount(""); setDescription(""); setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(""); setTags(""); setNotes("");
    }
    setIsRecurring(transaction?.isRecurring ?? false);
    setIsSplit(false);
    setSplitLegs([
      { id: crypto.randomUUID(), budgetId: "", amount: "" },
      { id: crypto.randomUUID(), budgetId: "", amount: "" },
    ]);
    setPendingFile(null);
    setPendingPreview(null);
    setRemoveExistingAttachment(false);
    setOcrReviewOpen(false);
  }, [transaction, defaultType]);

  // Revoke object URL on unmount / change
  useEffect(() => {
    return () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); };
  }, [pendingPreview]);

  function handleFileSelect(file: File) {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setRemoveExistingAttachment(false);
    // OCR pre-fill: show review step after image is selected
    setOcrReviewOpen(true);
  }

  function handleRemovePending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }

  function handleRemoveExisting() {
    setRemoveExistingAttachment(true);
  }

  const isPending = createMutation.isPending || updateMutation.isPending || createRecurringMutation.isPending || createSplitMutation.isPending || isUploading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (!parsedAmount || parsedAmount <= 0) return;

    const payload = {
      type,
      amount: parsedAmount,
      description: description.trim(),
      date,
      categoryId: categoryId || undefined,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
    };

    try {
      let txId: string;

      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        txId = transaction!.id;
      } else if (isSplit) {
        const validLegs = splitLegs.filter((l) => l.budgetId && Number.parseFloat(l.amount) > 0);
        const result = await createSplitMutation.mutateAsync({
          budgetId,
          ...payload,
          totalAmount: parsedAmount,
          legs: validLegs.map((l) => ({
            budgetId: l.budgetId,
            amount: Math.round(Number.parseFloat(l.amount)),
          })),
        });
        txId = result.legs[0]?.id ?? "";
      } else if (isRecurring) {
        const interval = parseInt(recurrenceInterval) || 1;
        const rule = `FREQ=${recurrenceFreq};INTERVAL=${interval}`;
        const created = await createRecurringMutation.mutateAsync({ budgetId, ...payload, recurrenceRule: rule });
        txId = created.id;
      } else {
        const created = await createMutation.mutateAsync({ budgetId, ...payload });
        txId = created.id;
      }

      // Handle attachment changes
      let attachmentChanged = false;
      if (pendingFile) {
        setIsUploading(true);
        try {
          // Delete existing first if present
          if (existingAttachment) {
            await transactionService.removeAttachment(existingAttachment.id);
          }
          // Upload + attach new file
          const { fileId } = await mediaService.uploadImage(pendingFile);
          await transactionService.attachFile(txId, fileId, pendingFile.name);
          attachmentChanged = true;
        } finally {
          setIsUploading(false);
        }
      } else if (removeExistingAttachment && existingAttachment) {
        await transactionService.removeAttachment(existingAttachment.id);
        attachmentChanged = true;
      }

      // Invalidate attachment cache and list after attachment operations
      if (attachmentChanged) {
        await qc.invalidateQueries({ queryKey: transactionKeys.attachments(txId) });
        await qc.invalidateQueries({ queryKey: transactionKeys.lists() });
      }

      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      onClose();
    } catch {
      toast.error(isEdit ? t("updateError") : t("createError"));
    }
  }

  const filteredCategories = categories.filter((c) => c.type === type && !c.archived);

  // Determine what the attachment picker shows as "existing"
  const visibleExisting = !removeExistingAttachment ? existingAttachment : null;

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? t("editTitle") : t("createTitle")}</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>
        <SheetBody>
          <form id="tx-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <div className="flex gap-2">
                {(["expense", "income"] as TransactionType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setType(v)}
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
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>{t("amount")}</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
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

            {/* Date */}
            <div className="space-y-1.5">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>{t("category")}</Label>
              <SelectNative value={categoryId} onValueChange={setCategoryId}>
                <option value="">{t("categoryNone")}</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectNative>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>{t("tags")}</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("tagsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>{t("notes")}</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("notesPlaceholder")}
                className="flex w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Recurring — only for new transactions */}
            {!isEdit && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label>{t("recurring")}</Label>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRecurring}
                    onClick={() => setIsRecurring((p) => !p)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      isRecurring ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      isRecurring ? "translate-x-4" : "translate-x-0",
                    )} />
                  </button>
                </div>

                {isRecurring && (
                  <div className="flex gap-2 rounded-xl bg-muted/40 p-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("frequency")}</p>
                      <select
                        value={recurrenceFreq}
                        onChange={(e) => setRecurrenceFreq(e.target.value as typeof recurrenceFreq)}
                        className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="DAILY">{t("freqDaily")}</option>
                        <option value="WEEKLY">{t("freqWeekly")}</option>
                        <option value="MONTHLY">{t("freqMonthly")}</option>
                        <option value="YEARLY">{t("freqYearly")}</option>
                      </select>
                    </div>
                    <div className="w-20 space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("every")}</p>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(e.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-center text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Split — only for new transactions */}
            {!isEdit && !isRecurring && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label>{t("split")}</Label>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isSplit}
                    onClick={() => setIsSplit((p) => !p)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      isSplit ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      isSplit ? "translate-x-4" : "translate-x-0",
                    )} />
                  </button>
                </div>

                {isSplit && (
                  <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("splitLegs")}
                    </p>

                    {/* Validation: sum check */}
                    {(() => {
                      const legTotal = splitLegs.reduce((s, l) => s + (Number.parseFloat(l.amount) || 0), 0);
                      const total = Number.parseFloat(amount) || 0;
                      const diff = Math.abs(legTotal - total);
                      if (total > 0 && diff > 1) {
                        return (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {t("splitMismatch", { diff: diff.toLocaleString() })}
                          </p>
                        );
                      }
                      return null;
                    })()}

                    {splitLegs.map((leg, idx) => (
                      <div key={leg.id} className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{idx + 1}</span>
                        <select
                          value={leg.budgetId}
                          onChange={(e) => setSplitLegs((prev) =>
                            prev.map((l) => l.id === leg.id ? { ...l, budgetId: e.target.value } : l)
                          )}
                          className="flex-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">{t("splitSelectBudget")}</option>
                          {allBudgets.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={leg.amount}
                          onChange={(e) => setSplitLegs((prev) =>
                            prev.map((l) => l.id === leg.id ? { ...l, amount: e.target.value } : l)
                          )}
                          placeholder="0"
                          className="w-24 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-right text-xs tabular-nums text-foreground focus:border-primary focus:outline-none"
                        />
                        {splitLegs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSplitLegs((prev) => prev.filter((l) => l.id !== leg.id))}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setSplitLegs((prev) => [...prev, { id: crypto.randomUUID(), budgetId: "", amount: "" }])}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      {t("splitAddLeg")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Attachment */}
            <div className="space-y-1.5">
              <Label>{t("attachment")}</Label>
              <AttachmentPicker
                existingAttachment={visibleExisting}
                pendingFile={pendingFile}
                pendingPreview={pendingPreview}
                onFileSelect={handleFileSelect}
                onRemovePending={handleRemovePending}
                onRemoveExisting={handleRemoveExisting}
                hint={t("attachmentHint")}
                addLabel={t("attachmentAdd")}
                changeLabel={t("attachmentChange")}
                removeLabel={t("attachmentRemove")}
              />
            </div>
          </form>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="tx-form" disabled={isPending}>
            {isUploading ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("uploading")}</>
            ) : isPending ? (
              t("saving")
            ) : isEdit ? (
              t("save")
            ) : (
              t("create")
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* OCR pre-fill review dialog */}
    <Dialog open={ocrReviewOpen} onOpenChange={(v) => !v && setOcrReviewOpen(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("ocrTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">{t("ocrHint")}</p>
          {pendingPreview && (
            <img src={pendingPreview} alt="Receipt" className="h-32 w-full rounded-xl object-cover border border-border/60" />
          )}
          <p className="text-xs text-muted-foreground italic">{t("ocrNotAvailable")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOcrReviewOpen(false)}>
            {t("ocrSkip")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
