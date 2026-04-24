"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useCreateBudgetMutation, useTemplatesQuery } from "@/modules/budget/hooks";
import { useToast } from "@/components/state/toast-provider";
import type { BudgetType } from "@/services/budget-service";

interface CreateBudgetDialogProps {
  open: boolean;
  orgId: string;
  onClose: () => void;
}

export function CreateBudgetDialog({ open, orgId, onClose }: CreateBudgetDialogProps) {
  const t = useTranslations("budget.create");
  const toast = useToast();
  const mutation = useCreateBudgetMutation();
  const { data: templates = [] } = useTemplatesQuery();

  const [name, setName] = useState("");
  const [type, setType] = useState<BudgetType>("standard");
  const [currency, setCurrency] = useState("VND");
  const [templateId, setTemplateId] = useState("");

  function handleClose() {
    setName(""); setType("standard"); setCurrency("VND"); setTemplateId("");
    onClose();
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl) setName(tpl.name);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate(
      { orgId, name: name.trim(), type, currency, templateId: templateId || undefined },
      {
        onSuccess: () => { toast.success(t("success")); handleClose(); },
        onError: () => toast.error(t("error")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("type")}</Label>
            <SelectNative value={type} onValueChange={(v) => setType(v as BudgetType)}>
              <option value="standard">{t("typeStandard")}</option>
              <option value="saving">{t("typeSaving")}</option>
              <option value="debt">{t("typeDebt")}</option>
              <option value="invest">{t("typeInvest")}</option>
              <option value="sharing">{t("typeSharing")}</option>
            </SelectNative>
          </div>

          <div className="space-y-1.5">
            <Label>{t("currency")}</Label>
            <SelectNative value={currency} onValueChange={setCurrency}>
              <option value="VND">VND — Vietnamese Dong</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </SelectNative>
          </div>

          {templates.length > 0 ? (
            <div className="space-y-1.5">
              <Label>{t("template")}</Label>
              <SelectNative value={templateId} onValueChange={handleTemplateChange}>
                <option value="">{t("templateNone")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </SelectNative>
            </div>
          ) : null}

          {mutation.isError ? (
            <p className="text-xs text-destructive">{t("error")}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
