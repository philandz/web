"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCommentsQuery, useAddCommentMutation, useDeleteCommentMutation } from "@/modules/sharing/hooks";
import { useParticipantNameLookup } from "@/modules/sharing/participant-name-lookup";
import { useAuthStore } from "@/lib/auth-store";
import type { Expense, ExpenseComment } from "@/services/sharing-service";
import { useToast } from "@/components/state/toast-provider";
import { Loader2, Trash2, Edit, MessageCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";
import { safeDisplayName } from "@/lib/safe-display-name";

type ExpenseDetailSheetProps = {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (expenseId: string) => void;
  onEdit?: (expense: Expense) => void;
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 1) return `${days} days ago`;
  if (days === 1) return "yesterday";
  if (hours > 1) return `${hours} hours ago`;
  if (hours === 1) return "1 hour ago" ;
  if (minutes > 1) return `${minutes} minutes ago`;
  if (minutes === 1) return "1 minute ago" ;
  return "just now";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseDetailSheet({
  expense,
  open,
  onOpenChange,
  onDelete,
  onEdit,
}: ExpenseDetailSheetProps) {
  const t = useTranslations("sharing");
  const [commentText, setCommentText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();
  const { resolve: resolveName } = useParticipantNameLookup(expense?.budgetId ?? "");

  const { data: comments, isLoading: commentsLoading } = useCommentsQuery(
    expense?.id
  );
  const addComment = useAddCommentMutation();
  const deleteComment = useDeleteCommentMutation();

  const currentUserId = useAuthStore((state) => state.profile?.id);
  const isOwnerOrPayer = Boolean(
    expense &&
      currentUserId &&
      (expense.paidBy === currentUserId ||
        (expense as Expense & { createdBy?: string }).createdBy === currentUserId)
  );

  function handleAddComment() {
    if (!commentText.trim() || !expense) return;
    addComment.mutate(
      { expenseId: expense.id, body: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText("");
          toast.success(t("comment.commentAdded"));
        },
        onError: () => toast.error(t("comment.commentAddedError")),
      }
    );
  }

  function handleDeleteComment(commentId: string) {
    deleteComment.mutate(commentId, {
      onSuccess: () => toast.success(t("comment.commentDeleted")),
      onError: () => toast.error(t("comment.commentDeletedError")),
    });
  }

  function handleDelete() {
    if (!expense) return;
    onDelete?.(expense.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  if (!expense) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <SheetTitle>{t("expense.details")}</SheetTitle>
          </SheetHeader>

          <SheetBody className="flex-1 overflow-y-auto space-y-6">
            {/* Header section */}
            <div className="space-y-3 text-center py-4 border-b border-border/60">
              <MoneyAmount value={expense.totalAmount} size="xl" />
              <p className="text-base font-medium text-foreground">
                {expense.description}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {formatDate(expense.expenseDate)}
                </span>
                {expense.categoryId && (
                  <Badge variant="secondary" className="text-xs">
                    {t("expense.category")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("expense.paidBy", { name: safeDisplayName(resolveName(expense.paidBy)) })}
              </p>
            </div>

            {/* Split breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">{t("expense.splitBreakdown")}</h4>
              <div className="space-y-2">
                {expense.legs.map((leg) => (
                  <div
                    key={leg.userId}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar name={safeDisplayName(resolveName(leg.userId))} size={28} />
                      <span className="text-sm font-medium">{safeDisplayName(resolveName(leg.userId))}</span>
                    </div>
                    <MoneyAmount value={leg.amount} size="sm" sign="neutral" />
                  </div>
                ))}
              </div>
            </div>

            {/* Comments thread */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">{t("comment.comments")}</h4>
              </div>

              {commentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-2 rounded-lg bg-muted/30">
                      <div className="flex items-start gap-2">
                        <UserAvatar
                          name={comment.authorDisplayName}
                          size={24}
                          className="shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.authorDisplayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-0.5">
                            {comment.body}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={t("comment.deleteComment")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("comment.noComments")}
                </p>
              )}

              {/* Comment input */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={t("comment.commentInputPlaceholder")}
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("comment.addCommentCta")
                  )}
                </Button>
              </div>
            </div>
          </SheetBody>

          <SheetFooter className="shrink-0 border-t border-border/60 px-5 py-4">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("form.close")}
              </Button>
              {isOwnerOrPayer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(expense)}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  {t("form.edit")}
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-red-50 hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t("form.delete")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t("expense.deleteExpense")}
        description={t("expense.deleteExpenseConfirm")}
        destructive
        confirmLabel={t("form.delete")}
        onConfirm={handleDelete}
      />
    </>
  );
}