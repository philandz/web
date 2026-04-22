"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { useCreateCategoryMutation, useUpdateCategoryMutation } from "@/modules/category/hooks";
import type { Category, CategoryType } from "@/services/category-service";

const ICON_OPTIONS = ["📦","🍔","🚗","🏠","💊","✈️","🛒","💡","📱","🎮","👕","🎓","💰","🏋️","🎵","🐾","🌿","🔧","💼","🎁"];
const COLOR_OPTIONS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  category?: Category; // edit mode
  defaultType?: CategoryType;
}

export function CategoryFormDialog({ open, onClose, budgetId, category, defaultType = "expense" }: CategoryFormDialogProps) {
  const t = useTranslations("budget.catForm");
  const toast = useToast();
  const isEdit = Boolean(category);
  const createMutation = useCreateCategoryMutation(budgetId);
  const updateMutation = useUpdateCategoryMutation(budgetId);

  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<CategoryType>(category?.type ?? defaultType);
  const [icon, setIcon] = useState(category?.icon ?? "📦");
  const [color, setColor] = useState(category?.color ?? "#6366f1");
  const [planned, setPlanned] = useState(category?.plannedAmount ? String(category.plannedAmount) : "");

  useEffect(() => {
    if (category) {
      setName(category.name); setType(category.type);
      setIcon(category.icon); setColor(category.color);
      setPlanned(category.plannedAmount ? String(category.plannedAmount) : "");
    } else {
      setName(""); setType(defaultType); setIcon("📦"); setColor("#6366f1"); setPlanned("");
    }
  }, [category, defaultType]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), icon, color, plannedAmount: planned ? parseFloat(planned) : undefined };

    if (isEdit) {
      updateMutation.mutate(
        { categoryId: category!.id, ...payload },
        { onSuccess: () => { toast.success(t("updateSuccess")); onClose(); }, onError: () => toast.error(t("updateError")) }
      );
    } else {
      createMutation.mutate(
        { type, ...payload },
        { onSuccess: () => { toast.success(t("createSuccess")); onClose(); }, onError: () => toast.error(t("createError")) }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Type (only for create) */}
          {!isEdit ? (
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <div className="flex gap-2">
                {(["expense", "income"] as CategoryType[]).map((v) => (
                  <button key={v} type="button" onClick={() => setType(v)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${type === v ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {t(v)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label>{t("icon")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`h-9 w-9 rounded-lg text-lg transition-colors ${icon === ic ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label>{t("color")}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-2 ring-offset-card" : "hover:scale-110"}`}
                  style={{ background: c, ringColor: c }} />
              ))}
            </div>
          </div>

          {/* Planned budget */}
          <div className="space-y-1.5">
            <Label>{t("planned")}</Label>
            <Input type="number" min="0" step="any" value={planned} onChange={(e) => setPlanned(e.target.value)} placeholder={t("plannedPlaceholder")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={isPending}>{isPending ? t("saving") : isEdit ? t("save") : t("create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
