"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ChevronDown, FolderOpen, MoreHorizontal, Plus } from "lucide-react";
import { CategoryDetailDrawer } from "@/components/philand/category-detail-drawer";
import { CategoryFormDialog } from "@/components/philand/category-form-dialog";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/state/toast-provider";
import { useArchiveCategoryMutation, useCategoriesQuery, useDeleteCategoryMutation } from "@/modules/category/hooks";
import type { Category, CategoryType } from "@/services/category-service";
import { cn } from "@/lib/utils";

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Category row
// ---------------------------------------------------------------------------

interface CategoryRowProps {
  category: Category;
  currency: string;
  budgetId: string;
  onEdit: (c: Category) => void;
  onDetail: (c: Category) => void;
  onArchive: (c: Category) => void;
  onDelete: (c: Category) => void;
}

function CategoryRow({ category, currency, onEdit, onDetail, onArchive, onDelete }: CategoryRowProps) {
  const t = useTranslations("budget.categories");
  const usagePct = category.usagePct ?? 0;
  const barColor =
    usagePct >= 100 ? "bg-red-500" :
    usagePct >= 80  ? "bg-amber-500" :
    "bg-primary";

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 md:px-6"
      onClick={() => onDetail(category)}
    >
      {/* Icon + color swatch */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: `${category.color}22`, border: `1.5px solid ${category.color}55` }}
      >
        {category.icon}
      </div>

      {/* Name + mobile spend summary */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">
          {category.name}
        </p>
        {/* Mobile-only: show actual spend */}
        <p className="text-[11px] text-muted-foreground sm:hidden">
          {fmt(category.actualSpend, currency)}
          {category.plannedAmount
            ? ` / ${fmt(category.plannedAmount, currency)}`
            : ""}
          {category.plannedAmount && (
            <span className={cn(
              "ml-1.5 font-medium",
              usagePct >= 100 ? "text-red-500" :
              usagePct >= 80  ? "text-amber-600 dark:text-amber-400" :
              "text-muted-foreground",
            )}>
              {Math.round(usagePct)}%
            </span>
          )}
        </p>
      </div>

      {/* Planned (desktop) */}
      <div className="hidden text-right sm:block w-24">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("planned")}
        </p>
        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
          {category.plannedAmount ? fmt(category.plannedAmount, currency) : "—"}
        </p>
      </div>

      {/* Actual (desktop) */}
      <div className="hidden text-right sm:block w-24">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("actual")}
        </p>
        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
          {fmt(category.actualSpend, currency)}
        </p>
      </div>

      {/* Usage bar (desktop) */}
      <div className="hidden w-20 sm:block">
        {category.plannedAmount ? (
          <>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className={cn(
                "font-medium",
                usagePct >= 100 ? "text-red-500" :
                usagePct >= 80  ? "text-amber-600 dark:text-amber-400" :
                "text-muted-foreground",
              )}>
                {Math.round(usagePct)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-300", barColor)}
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="h-4" aria-hidden />
        )}
      </div>

      {/* Tx count (desktop) */}
      <div className="hidden w-10 text-right sm:block">
        <p className="text-xs tabular-nums text-muted-foreground">
          {category.transactionCount}
        </p>
      </div>

      {/* Actions */}
      <div
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(category)}>
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(category)}>
              {t("archive")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(category)}>
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  title: string;
  categories: Category[];
  currency: string;
  budgetId: string;
  type: CategoryType;
  onEdit: (c: Category) => void;
  onDetail: (c: Category) => void;
  onArchive: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAdd: (type: CategoryType) => void;
}

function CategorySection({
  title,
  categories,
  currency,
  budgetId,
  type,
  onEdit,
  onDetail,
  onArchive,
  onDelete,
  onAdd,
}: CategorySectionProps) {
  const t = useTranslations("budget.categories");

  return (
    <div className="surface-panel overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {categories.length} {t("items")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onAdd(type)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("add")}
        </Button>
      </div>

      {/* Column headers (desktop only) */}
      {categories.length > 0 && (
        <div className="hidden items-center gap-3 border-b border-border/40 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:flex md:px-6">
          <div className="w-9 shrink-0" />
          <div className="flex-1">{t("colName")}</div>
          <div className="w-24 text-right">{t("colPlanned")}</div>
          <div className="w-24 text-right">{t("colActual")}</div>
          <div className="w-20">{t("colUsage")}</div>
          <div className="w-10 text-right">{t("colTx")}</div>
          <div className="w-7" />
        </div>
      )}

      {/* Rows */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <FolderOpen className="h-4.5 w-4.5 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAdd(type)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("add")}
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              currency={currency}
              budgetId={budgetId}
              onEdit={onEdit}
              onDetail={onDetail}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categories tab
// ---------------------------------------------------------------------------

interface CategoriesTabProps {
  budgetId: string;
  currency?: string;
}

export function CategoriesTab({
  budgetId,
  currency = "VND",
}: CategoriesTabProps) {
  const t = useTranslations("budget.categories");
  const toast = useToast();

  const { data: categories = [], isLoading, isError } = useCategoriesQuery(budgetId);
  const archiveMutation = useArchiveCategoryMutation(budgetId);
  const deleteMutation = useDeleteCategoryMutation(budgetId);

  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [detailCategory, setDetailCategory] = useState<Category | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<CategoryType>("expense");
  const [showArchived, setShowArchived] = useState(false);

  const active   = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);
  const expense  = active.filter((c) => c.type === "expense");
  const income   = active.filter((c) => c.type === "income");

  function openAdd(type: CategoryType) {
    setEditCategory(null);
    setFormType(type);
    setFormOpen(true);
  }

  function handleArchive(c: Category) {
    archiveMutation.mutate(c.id, {
      onSuccess: () => toast.success(t("archiveSuccess")),
      onError: () => toast.error(t("archiveError")),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success(t("deleteSuccess")); setDeleteTarget(null); },
      onError: () => toast.error(t("deleteError")),
    });
  }

  if (isLoading) return <SectionLoadingState rows={4} />;

  if (isError) {
    return (
      <div className="surface-panel flex flex-col items-center gap-3 rounded-2xl py-14 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground">{t("loadError")}</p>
        <p className="text-xs text-muted-foreground">{t("loadErrorHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategorySection
        title={t("expenseTitle")}
        categories={expense}
        currency={currency}
        budgetId={budgetId}
        type="expense"
        onEdit={(c) => { setEditCategory(c); setFormOpen(true); }}
        onDetail={(c) => { setDetailCategory(c); setDetailOpen(true); }}
        onArchive={handleArchive}
        onDelete={setDeleteTarget}
        onAdd={openAdd}
      />

      <CategorySection
        title={t("incomeTitle")}
        categories={income}
        currency={currency}
        budgetId={budgetId}
        type="income"
        onEdit={(c) => { setEditCategory(c); setFormOpen(true); }}
        onDetail={(c) => { setDetailCategory(c); setDetailOpen(true); }}
        onArchive={handleArchive}
        onDelete={setDeleteTarget}
        onAdd={openAdd}
      />

      {/* Archived section */}
      {archived.length > 0 && (
        <div className="surface-panel overflow-hidden rounded-2xl">
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40 md:px-6"
            onClick={() => setShowArchived((p) => !p)}
          >
            <span className="text-sm font-medium text-muted-foreground">
              {t("archivedTitle")} ({archived.length})
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              showArchived && "rotate-180",
            )} />
          </button>

          {showArchived && (
            <div className="divide-y divide-border/40 border-t border-border/60">
              {archived.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 opacity-50 md:px-6"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground line-through">{c.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {fmt(c.actualSpend, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category form dialog */}
      <CategoryFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditCategory(null); }}
        budgetId={budgetId}
        category={editCategory ?? undefined}
        defaultType={formType}
      />

      {/* Detail drawer */}
      <CategoryDetailDrawer
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCategory(null); }}
        category={detailCategory}
        budgetId={budgetId}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.transactionCount
              ? t("deleteWarning", { count: deleteTarget.transactionCount })
              : t("deleteDescription")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
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
    </div>
  );
}
