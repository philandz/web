"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownLeft, ArrowUpRight, Calendar, FolderOpen,
  MessageSquare, Paperclip, Pencil, RefreshCw, Send, Tag, Trash2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/state/toast-provider";
import {
  useDeleteTransactionMutation, useTransactionAttachmentsQuery,
  useCommentsQuery, useAddCommentMutation, useEditCommentMutation, useDeleteCommentMutation,
} from "@/modules/transaction/hooks";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { useBudgetMembersQuery } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import { TransactionFormDrawer } from "@/components/philand/transaction-form-drawer";
import type { Transaction } from "@/services/transaction-service";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number, currency?: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency ?? "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

function fmtTs(ts: number) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts < 1e12 ? ts * 1000 : ts));
}

// ---------------------------------------------------------------------------
// Info row — label + value with optional icon
// ---------------------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      {Icon ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ) : (
        <div className="h-7 w-7 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment grid
// ---------------------------------------------------------------------------

function AttachmentGrid({ entryId, label }: { entryId: string; label: string }) {
  const { data: attachments = [], isLoading } = useTransactionAttachmentsQuery(entryId);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading || attachments.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {attachments.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setLightbox(a.downloadUrl)}
            className="group relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <img src={a.downloadUrl} alt={a.fileName} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="truncate text-[10px] text-white">{a.fileName}</span>
            </div>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Attachment"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment thread
// ---------------------------------------------------------------------------

function CommentThread({ entryId, members }: {
  entryId: string;
  members: import("@/services/budget-service").BudgetMember[];
}) {
  const t = useTranslations("budget.txDetail");
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const { data: comments = [], isLoading } = useCommentsQuery(entryId);
  const addMutation = useAddCommentMutation(entryId);
  const editMutation = useEditCommentMutation(entryId);
  const deleteMutation = useDeleteCommentMutation(entryId);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    addMutation.mutate(draft.trim(), {
      onSuccess: () => setDraft(""),
      onError: () => toast.error(t("commentError")),
    });
  }

  function handleEdit(commentId: string) {
    editMutation.mutate({ commentId, body: editBody.trim() }, {
      onSuccess: () => setEditingId(null),
      onError: () => toast.error(t("commentError")),
    });
  }

  function handleDelete(commentId: string) {
    deleteMutation.mutate(commentId, {
      onError: () => toast.error(t("commentError")),
    });
  }

  function fmtTs(ts: number) {
    if (!ts) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      .format(new Date(ts < 1e12 ? ts * 1000 : ts));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("comments")} {comments.length > 0 ? `(${comments.length})` : ""}
        </p>
      </div>

      {/* Comment list */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => {
            const author = memberMap.get(c.createdBy);
            const isMe = c.createdBy === profile?.id;
            const isEditing = editingId === c.id;

            return (
              <div key={c.id} className="flex gap-2.5">
                <UserAvatar
                  name={author?.displayName ?? "?"}
                  src={isMe ? (profile?.avatar ?? undefined) : undefined}
                  size={28}
                  fallbackClassName="text-[10px] font-semibold"
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {author?.displayName ?? t("unknownUser")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtTs(c.createdAt)}</span>
                  </div>

                  {isEditing ? (
                    <div className="mt-1 flex gap-1.5">
                      <input
                        autoFocus
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(c.id); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(c.id)} disabled={editMutation.isPending}>
                        {t("save")}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-foreground leading-relaxed">{c.body}</p>
                  )}

                  {isMe && !isEditing && (
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <Button
          type="submit"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          disabled={!draft.trim() || addMutation.isPending}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TransactionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  budgetId: string;
  currency?: string;
}

export function TransactionDetailDrawer({
  open,
  onClose,
  transaction,
  budgetId,
  currency = "VND",
}: TransactionDetailDrawerProps) {
  const t = useTranslations("budget.txDetail");
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const deleteMutation = useDeleteTransactionMutation();
  const { data: categories = [] } = useCategoriesQuery(budgetId);
  const { data: members = [] } = useBudgetMembersQuery(budgetId);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.type === "income";
  const category = categories.find((c) => c.id === transaction.categoryId);
  const creator = transaction.createdBy
    ? members.find((m) => m.userId === transaction.createdBy)
    : undefined;
  const creatorIsMe = transaction.createdBy === profile?.id;
  const creatorAvatar = creatorIsMe ? (profile?.avatar ?? undefined) : undefined;

  function handleDelete() {
    deleteMutation.mutate(transaction!.id, {
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
        setConfirmDelete(false);
        onClose();
      },
      onError: () => toast.error(t("deleteError")),
    });
  }

  return (
    <>
      <Sheet open={open && !editOpen} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetClose onClose={onClose} />
          </SheetHeader>

          <SheetBody className="space-y-5">

            {/* ── Amount hero ── */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl p-5 text-center",
              isIncome
                ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                : "bg-red-500/10 dark:bg-red-500/15",
            )}>
              {/* Background icon */}
              <div className={cn(
                "absolute right-4 top-4 opacity-10",
                isIncome ? "text-emerald-500" : "text-red-500",
              )}>
                {isIncome
                  ? <ArrowUpRight className="h-16 w-16" />
                  : <ArrowDownLeft className="h-16 w-16" />}
              </div>

              {/* Type badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isIncome
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/20 text-red-700 dark:text-red-400",
              )}>
                {isIncome
                  ? <ArrowUpRight className="h-3 w-3" />
                  : <ArrowDownLeft className="h-3 w-3" />}
                {isIncome ? t("income") ?? "Income" : t("expense") ?? "Expense"}
              </span>

              {/* Amount */}
              <p className={cn(
                "mt-3 text-4xl font-bold tracking-tight tabular-nums",
                isIncome
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400",
              )}>
                {isIncome ? "+" : "−"}{fmt(transaction.amount, currency)}
              </p>

              {/* Description */}
              <p className="mt-2 text-sm font-medium text-foreground/80 leading-snug">
                {transaction.description}
              </p>

              {/* Badges */}
              {(transaction.isRecurring || transaction.hasAttachment) && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {transaction.isRecurring && (
                    <span className="flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <RefreshCw className="h-3 w-3" /> Recurring
                    </span>
                  )}
                  {transaction.hasAttachment && (
                    <span className="flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Paperclip className="h-3 w-3" /> Attachment
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Detail fields ── */}
            <div className="divide-y divide-border/40 rounded-2xl border border-border/60 px-3">

              {/* Date */}
              <InfoRow icon={Calendar} label={t("date")}>
                {fmtDate(transaction.date)}
              </InfoRow>

              {/* Category */}
              {category ? (
                <InfoRow icon={FolderOpen} label={t("category")}>
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-sm"
                      style={{ background: `${category.color}22`, border: `1.5px solid ${category.color}55` }}
                    >
                      {category.icon}
                    </span>
                    {category.name}
                  </span>
                </InfoRow>
              ) : null}

              {/* Tags */}
              {transaction.tags.length > 0 && (
                <InfoRow icon={Tag} label={t("tags")}>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {transaction.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </InfoRow>
              )}

              {/* Notes */}
              {transaction.notes && (
                <div className="py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    {t("notes")}
                  </p>
                  <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-foreground leading-relaxed">
                    {transaction.notes}
                  </p>
                </div>
              )}

              {/* Created by */}
              {creator && (
                <InfoRow icon={User} label={t("createdBy")}>
                  <span className="flex items-center gap-2">
                    <UserAvatar
                      name={creator.displayName}
                      src={creatorAvatar}
                      size={22}
                      fallbackClassName="text-[9px] font-semibold"
                    />
                    <span>
                      {creator.displayName}
                      {creatorIsMe && (
                        <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          You
                        </span>
                      )}
                    </span>
                  </span>
                </InfoRow>
              )}

              {/* Created at */}
              {transaction.createdAt > 0 && (
                <InfoRow icon={Calendar} label={t("createdAt")}>
                  <span className="text-muted-foreground">{fmtTs(transaction.createdAt)}</span>
                </InfoRow>
              )}
            </div>

            {/* ── Attachments ── */}
            <AttachmentGrid entryId={transaction.id} label={t("attachments")} />

            {/* ── Comments ── */}
            <CommentThread entryId={transaction.id} members={members} />

            {/* ── Actions ── */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {t("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("delete")}
              </Button>
            </div>

          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Edit drawer */}
      <TransactionFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        budgetId={budgetId}
        transaction={transaction}
        currency={currency}
      />

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? t("deleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
