"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/state/toast-provider";
import { formatCurrency } from "@/lib/format";
import { usePlanQuery, useSetPlanMutation } from "@/modules/plan/hooks";
import type { BudgetRole } from "@/services/budget-service";
import type { PlanItemInput } from "@/services/plan-service";

import { PeriodSwitcher } from "./period-switcher";

interface PlanTabProps {
  budgetId: string;
  currency: string;
  myRole: BudgetRole;
}

type Edit = { def?: string; period?: string };

function toAmount(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Plan per category: a default for every period and optional one-period overrides. */
export function PlanTab({ budgetId, currency, myRole }: PlanTabProps) {
  const t = useTranslations("budget.plan");
  const locale = useLocale();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const { data: plan, isLoading } = usePlanQuery(budgetId, offset);
  const mutation = useSetPlanMutation(budgetId, offset);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [unallocated, setUnallocated] = useState<string | null>(null);
  const canEdit = myRole === "owner" || myRole === "manager";
  const money = (v: number) => formatCurrency(v, currency, locale);

  const rows = useMemo(() => (plan?.categories ?? []).filter((c) => c.kind === "expense" && !c.archived), [plan]);

  const items = useMemo(() => {
    const out: PlanItemInput[] = [];
    for (const r of rows) {
      const e = edits[r.categoryId];
      if (!e) continue;
      const def = e.def !== undefined ? toAmount(e.def) : null;
      const per = e.period !== undefined ? toAmount(e.period) : null;
      if (def !== null && def !== r.defaultPlanned) out.push({ categoryId: r.categoryId, plannedAmount: def, scope: "default" });
      if (per !== null && per !== r.planned) out.push({ categoryId: r.categoryId, plannedAmount: per, scope: "this_period" });
    }
    return out;
  }, [rows, edits]);
  const unallocatedValue = unallocated !== null ? toAmount(unallocated) : null;
  const unallocatedChanged = unallocatedValue !== null && unallocatedValue !== plan?.unallocatedPlanned;
  const dirty = items.length > 0 || unallocatedChanged;

  const projectedTotal = useMemo(() => {
    let total = unallocatedValue ?? plan?.unallocatedPlanned ?? 0;
    for (const r of rows) {
      const e = edits[r.categoryId];
      const per = e?.period !== undefined ? toAmount(e.period) : null;
      const def = e?.def !== undefined ? toAmount(e.def) : null;
      total += per ?? (r.periodOverride !== null ? r.planned : (def ?? r.defaultPlanned));
    }
    return total;
  }, [rows, edits, plan, unallocatedValue]);

  function save() {
    mutation.mutate(
      { items, unallocatedPlanned: unallocatedChanged ? (unallocatedValue ?? undefined) : undefined },
      {
        onSuccess: () => {
          setEdits({});
          setUnallocated(null);
          toast.success(t("saved"));
        },
        onError: () => toast.error(t("saveError")),
      },
    );
  }

  if (isLoading || !plan) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4" data-testid="plan-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodSwitcher offset={offset} onChange={(o) => { setOffset(o); setEdits({}); setUnallocated(null); }} from={plan.periodFrom} to={plan.periodTo} />
        <p className="text-sm">
          {t("total")}: <span className="font-semibold tabular-nums">{money(projectedTotal)}</span>
        </p>
      </div>

      <div className="surface-panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">{t("category")}</th>
              <th className="px-4 py-2.5 font-medium">{t("everyPeriod")}</th>
              <th className="px-4 py-2.5 font-medium">{t("thisPeriod")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noCategories")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const e = edits[r.categoryId] ?? {};
                return (
                  <tr key={r.categoryId} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2">
                      <span className="mr-1.5">{r.icon}</span>
                      {r.name}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        inputMode="numeric"
                        aria-label={`${r.name} ${t("everyPeriod")}`}
                        disabled={!canEdit}
                        value={e.def ?? String(r.defaultPlanned)}
                        onChange={(ev) => setEdits((p) => ({ ...p, [r.categoryId]: { ...p[r.categoryId], def: ev.target.value } }))}
                        className="h-8 w-36 tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Input
                          inputMode="numeric"
                          aria-label={`${r.name} ${t("thisPeriod")}`}
                          disabled={!canEdit}
                          value={e.period ?? String(r.planned)}
                          onChange={(ev) => setEdits((p) => ({ ...p, [r.categoryId]: { ...p[r.categoryId], period: ev.target.value } }))}
                          className="h-8 w-36 tabular-nums"
                        />
                        {r.periodOverride !== null ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{t("overridden")}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            <tr>
              <td className="px-4 py-2 text-muted-foreground">{t("unallocated")}</td>
              <td className="px-4 py-2" colSpan={2}>
                <Input
                  inputMode="numeric"
                  aria-label={t("unallocated")}
                  disabled={!canEdit}
                  value={unallocated ?? String(plan.unallocatedPlanned)}
                  onChange={(ev) => setUnallocated(ev.target.value)}
                  className="h-8 w-36 tabular-nums"
                />
                <span className="ml-2 text-xs text-muted-foreground">{t("unallocatedHint")}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" disabled={!dirty || mutation.isPending} onClick={() => { setEdits({}); setUnallocated(null); }}>
            {t("discard")}
          </Button>
          <Button disabled={!dirty || mutation.isPending} onClick={save}>
            {t("save")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("readOnly")}</p>
      )}
    </div>
  );
}
