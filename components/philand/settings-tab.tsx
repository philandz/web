"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useToast } from "@/components/state/toast-provider";
import { useDeleteBudgetMutation, useRolloverQuery, useSetEnvelopeMutation, useSetRolloverMutation, useUpdateBudgetMutation } from "@/modules/budget/hooks";
import type { Budget, BudgetRole, BudgetType, RolloverPolicy } from "@/services/budget-service";

// ---------------------------------------------------------------------------
// Layout helper — 2-col setting row
// ---------------------------------------------------------------------------

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-10">
      {/* Left: label + description */}
      <div className="sm:w-56 sm:shrink-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {/* Right: form/control */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

interface SettingsTabProps {
  budget: Budget;
  myRole: BudgetRole;
}

export function SettingsTab({ budget, myRole }: SettingsTabProps) {
  const t = useTranslations("budget.settings");
  const toast = useToast();
  const router = useRouter();
  const isOwner = myRole === "owner";

  const updateMutation = useUpdateBudgetMutation(budget.id);
  const envelopeMutation = useSetEnvelopeMutation(budget.id);
  const rolloverMutation = useSetRolloverMutation(budget.id);
  const deleteMutation = useDeleteBudgetMutation(budget.id);
  const { data: rolloverPolicy } = useRolloverQuery(budget.id);

  const [name, setName] = useState(budget.name);
  const [type, setType] = useState<BudgetType>(budget.type);
  const [envelopeLimit, setEnvelopeLimit] = useState("");
  const [rollover, setRollover] = useState<RolloverPolicy>(rolloverPolicy ?? "reset");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === budget.name) return;
    updateMutation.mutate(
      { name: name.trim() },
      { onSuccess: () => toast.success(t("renameSuccess")), onError: () => toast.error(t("renameError")) },
    );
  }

  function handleTypeChange(e: React.FormEvent) {
    e.preventDefault();
    if (type === budget.type) return;
    updateMutation.mutate(
      { type },
      { onSuccess: () => toast.success(t("typeSuccess")), onError: () => toast.error(t("typeError")) },
    );
  }

  function handleEnvelope(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(envelopeLimit.replace(/,/g, ""));
    envelopeMutation.mutate(
      isNaN(val) ? 0 : val,
      { onSuccess: () => toast.success(t("envelopeSuccess")), onError: () => toast.error(t("envelopeError")) },
    );
  }

  function handleRollover(e: React.FormEvent) {
    e.preventDefault();
    rolloverMutation.mutate(
      rollover,
      { onSuccess: () => toast.success(t("rolloverSuccess")), onError: () => toast.error(t("rolloverError")) },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => { toast.success(t("deleteSuccess")); router.push(routes.budgets); },
      onError: () => toast.error(t("deleteError")),
    });
  }

  const readOnly = !isOwner;

  return (
    <div className="space-y-4">

      {/* ── General settings card ── */}
      <section className="surface-panel divide-y divide-border/50 overflow-hidden rounded-2xl">
        {/* Section header */}
        <div className="px-5 py-4 md:px-6">
          <h2 className="text-sm font-semibold text-foreground">{t("generalTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("generalHint")}</p>
        </div>

        {/* Rename */}
        <div className="px-5 py-5 md:px-6">
          <SettingRow title={t("renameTitle")} description={t("renameHint")}>
            <form onSubmit={handleRename} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={readOnly || updateMutation.isPending || name.trim() === budget.name}
              >
                {t("save")}
              </Button>
            </form>
          </SettingRow>
        </div>

        {/* Change type */}
        <div className="px-5 py-5 md:px-6">
          <SettingRow title={t("typeTitle")} description={t("typeHint")}>
            <form onSubmit={handleTypeChange} className="flex gap-2">
              <SelectNative
                value={type}
                onValueChange={(v) => setType(v as BudgetType)}
                className="flex-1"
              >
                <option value="standard">{t("typeStandard")}</option>
                <option value="saving">{t("typeSaving")}</option>
                <option value="debt">{t("typeDebt")}</option>
                <option value="invest">{t("typeInvest")}</option>
                <option value="sharing">{t("typeSharing")}</option>
              </SelectNative>
              <Button
                type="submit"
                size="sm"
                disabled={readOnly || updateMutation.isPending || type === budget.type}
              >
                {t("save")}
              </Button>
            </form>
          </SettingRow>
        </div>
      </section>

      {/* ── Budget rules card ── */}
      <section className="surface-panel divide-y divide-border/50 overflow-hidden rounded-2xl">
        {/* Section header */}
        <div className="px-5 py-4 md:px-6">
          <h2 className="text-sm font-semibold text-foreground">{t("rulesTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("rulesHint")}</p>
        </div>

        {/* Envelope limit */}
        <div className="px-5 py-5 md:px-6">
          <SettingRow title={t("envelopeTitle")} description={t("envelopeHint")}>
            <form onSubmit={handleEnvelope} className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                value={envelopeLimit}
                onChange={(e) => setEnvelopeLimit(e.target.value)}
                placeholder={t("envelopePlaceholder")}
                disabled={readOnly}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={readOnly || envelopeMutation.isPending}>
                {t("save")}
              </Button>
            </form>
          </SettingRow>
        </div>

        {/* Rollover policy */}
        <div className="px-5 py-5 md:px-6">
          <SettingRow title={t("rolloverTitle")} description={t("rolloverHint")}>
            <form onSubmit={handleRollover} className="flex gap-2">
              <SelectNative
                value={rollover}
                onValueChange={(v) => setRollover(v as RolloverPolicy)}
                className="flex-1"
              >
                <option value="reset">{t("rolloverReset")}</option>
                <option value="carry_forward">{t("rolloverCarry")}</option>
              </SelectNative>
              <Button type="submit" size="sm" disabled={readOnly || rolloverMutation.isPending}>
                {t("save")}
              </Button>
            </form>
          </SettingRow>
        </div>
      </section>

      {/* ── Danger zone ── */}
      {isOwner ? (
        <section className="overflow-hidden rounded-2xl border border-destructive/30">
          <div className="px-5 py-4 md:px-6">
            <h2 className="text-sm font-semibold text-destructive">{t("dangerTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("dangerHint")}</p>
          </div>
          <div className="border-t border-destructive/20 px-5 py-5 md:px-6">
            <SettingRow title={t("deleteButton")} description={t("dangerDeleteHint")}>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                {t("deleteButton")}
              </Button>
            </SettingRow>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
          <div className="space-y-1.5">
            <Label>{t("deleteConfirmLabel", { name: budget.name })}</Label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={budget.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              disabled={deleteConfirmName !== budget.name || deleteMutation.isPending}
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
