"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AmountInput } from "@/components/ui/amount-input";
import { isFeatureEnabled } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useCreateBudgetMutation, useTemplatesQuery } from "@/modules/budget/hooks";
import { useToast } from "@/components/state/toast-provider";
import type { BudgetType } from "@/services/budget-service";
import { BUDGET_TYPE_META } from "@/lib/budget-types";
import { coerceCurrency, currencyOptionsFor, WIZARD_TYPES } from "@/lib/budget/create-rules";
import { cn } from "@/lib/utils";

interface CreateBudgetDialogProps {
  open: boolean;
  orgId: string;
  onClose: () => void;
}

export function CreateBudgetDialog({ open, orgId, onClose }: CreateBudgetDialogProps) {
  const t = useTranslations("budget.create");
  const locale = useLocale();
  const toast = useToast();
  const mutation = useCreateBudgetMutation();
  const { data: templates = [] } = useTemplatesQuery();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<BudgetType>("standard");
  const [currency, setCurrency] = useState("VND");
  const [templateId, setTemplateId] = useState("");
  const [periodStartDay, setPeriodStartDay] = useState("1");
  const [expectedIncome, setExpectedIncome] = useState("");
  const planning = isFeatureEnabled("periodPlanning") && type === "standard";

  function handleClose() {
    setStep(1); setName(""); setType("standard"); setCurrency("VND"); setTemplateId("");
    setPeriodStartDay("1"); setExpectedIncome("");
    onClose();
  }

  function pickType(next: BudgetType) {
    setType(next);
    setCurrency((c) => coerceCurrency(next, c));
    setStep(2);
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
      {
        orgId,
        name: name.trim(),
        type,
        currency,
        templateId: templateId || undefined,
        locale,
        expectedIncome: planning && Number(expectedIncome) > 0 ? Number(expectedIncome) : undefined,
        periodStartDay: planning && periodStartDay !== "1" ? Number(periodStartDay) : undefined,
      },
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
          <DialogTitle>{step === 1 ? t("pickType") : t("title")}</DialogTitle>
        </DialogHeader>
        {step === 1 ? (
          <div className="grid gap-2 py-2" role="radiogroup" aria-label={t("type")}>
            {WIZARD_TYPES.map((bt) => {
              const meta = BUDGET_TYPE_META[bt];
              return (
                <button
                  key={bt}
                  type="button"
                  role="radio"
                  aria-checked={type === bt}
                  onClick={() => pickType(bt)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
                    type === bt ? "border-primary" : "border-border/60",
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.iconBg)}>
                    <meta.Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t(`type${bt[0].toUpperCase()}${bt.slice(1)}`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`typeDesc.${bt}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
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
            <Label>{t("currency")}</Label>
            <SelectNative value={currency} onValueChange={setCurrency}>
              {currencyOptionsFor(type).map((c) => (
                <option key={c} value={c}>
                  {c === "VND" ? "VND — Vietnamese Dong" : c === "USD" ? "USD — US Dollar" : "EUR — Euro"}
                </option>
              ))}
            </SelectNative>
            {type === "sharing" ? (
              <p className="text-xs text-muted-foreground">{t("sharingCurrencyHint")}</p>
            ) : null}
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

          {planning ? (
            <>
              <div className="space-y-1.5">
                <Label>{t("periodStartDay")}</Label>
                <SelectNative value={periodStartDay} onValueChange={setPeriodStartDay}>
                  {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </SelectNative>
                <p className="text-xs text-muted-foreground">{t("periodStartDayHint")}</p>
              </div>
              {templateId ? (
                <div className="space-y-1.5">
                  <Label>{t("expectedIncome")}</Label>
                  <AmountInput value={expectedIncome} onChange={setExpectedIncome} currency={currency} />
                  <p className="text-xs text-muted-foreground">{t("expectedIncomeHint")}</p>
                </div>
              ) : null}
            </>
          ) : null}

          {mutation.isError ? (
            <p className="text-xs text-destructive">{t("error")}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" className="mr-auto" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("back")}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
