"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Wallet, X } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { FormInput } from "@/components/form/form-input";
import { InlineAlert } from "@/components/state/inline-alert";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectNative } from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { useAdminBudgetsQuery } from "@/modules/admin/hooks";
import { useAdminOrgsQuery } from "@/modules/admin/hooks";
import type { BudgetType } from "@/services/budget-service";
import { cn } from "@/lib/utils";

const BUDGET_TYPES: BudgetType[] = ["standard", "saving", "debt", "invest", "sharing"];

type FilterValues = {
  orgId: string;
  budgetType: string;
  nameSearch: string;
};

const createFilterSchema = () =>
  z.object({
    orgId: z.string(),
    budgetType: z.string(),
    nameSearch: z.string().max(100).optional().or(z.literal(""))
  });

export default function AdminBudgetsPage() {
  const t = useTranslations("admin.budgets");
  const tCommon = useTranslations("common");
  const tBudget = useTranslations("budget");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { register, watch, setValue, reset } = useForm<FilterValues>({
    resolver: zodResolver(createFilterSchema()),
    defaultValues: { orgId: "", budgetType: "", nameSearch: "" }
  });
  const values = watch();

  const { data: orgsData } = useAdminOrgsQuery({ pageSize: 100 });
  const orgs = useMemo(() => orgsData?.items ?? [], [orgsData?.items]);
  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs) m.set(o.id, o.name);
    return m;
  }, [orgs]);

  const query = useAdminBudgetsQuery({
    orgId: values.orgId || undefined,
    budgetType: (values.budgetType || undefined) as BudgetType | undefined,
    nameSearch: values.nameSearch || undefined,
    page,
    pageSize
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <StaggerItem delay={0}>
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          eyebrow={t("badge")}
          icon={<Wallet className="h-5 w-5" />}
          actions={
            <Badge className="bg-highlight text-slate-900">{t("total", { count: total })}</Badge>
          }
        />
      </StaggerItem>

      <StaggerItem delay={40}>
        <Card className="surface-panel">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-[1fr_220px_180px_auto]">
              <FormInput
                id="filter-name"
                label={t("filter.name")}
                placeholder={t("filter.namePlaceholder")}
                {...register("nameSearch")}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("filter.org")}
                </label>
                <SelectNative
                  value={values.orgId}
                  onValueChange={(v) => {
                    setValue("orgId", v);
                    setPage(1);
                  }}
                >
                  <option value="">{t("filter.allOrgs")}</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("filter.type")}
                </label>
                <SelectNative
                  value={values.budgetType}
                  onValueChange={(v) => {
                    setValue("budgetType", v);
                    setPage(1);
                  }}
                >
                  <option value="">{t("filter.allTypes")}</option>
                  {BUDGET_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {tBudget(`type${bt[0].toUpperCase()}${bt.slice(1)}`, { defaultValue: bt })}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    reset({ orgId: "", budgetType: "", nameSearch: "" });
                    setPage(1);
                  }}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  {t("filter.reset")}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem delay={80}>
        {query.isError ? (
          <InlineAlert tone="error">{t("loadError")}</InlineAlert>
        ) : query.isLoading ? (
          <SectionLoadingState message={t("loading")} />
        ) : (query.data?.budgets.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <Card className="surface-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">{t("column.name")}</th>
                    <th className="px-4 py-3">{t("column.org")}</th>
                    <th className="px-4 py-3">{t("column.type")}</th>
                    <th className="px-4 py-3">{t("column.currency")}</th>
                    <th className="px-4 py-3">{t("column.envelope")}</th>
                    <th className="px-4 py-3">{t("column.members")}</th>
                    <th className="px-4 py-3">{t("column.role")}</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.budgets.map((b) => (
                    <tr
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      data-testid={`admin-budget-row-${b.id}`}
                      onClick={() => router.push(routes.adminBudgetDetail(b.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(routes.adminBudgetDetail(b.id));
                        }
                      }}
                      className="cursor-pointer border-b border-border/60 last:border-b-0 transition hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link
                          href={routes.adminBudgetDetail(b.id)}
                          className="text-primary hover:underline focus:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {b.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {orgNameById.get(b.orgId) ?? <span className="font-mono text-xs">{b.orgId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {tBudget(`type${b.type[0].toUpperCase()}${b.type.slice(1)}`, { defaultValue: b.type })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.currency}</td>
                      <td className="px-4 py-3 tabular-nums">{b.envelopeLimit.toLocaleString()}</td>
                      <td className="px-4 py-3 tabular-nums">{b.memberCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                            b.myRole === "owner" && "bg-primary/10 text-primary",
                            b.myRole === "manager" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            b.myRole === "contributor" && "bg-muted text-foreground",
                            b.myRole === "viewer" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {tBudget(`role${b.myRole[0].toUpperCase()}${b.myRole.slice(1)}`, { defaultValue: b.myRole })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {t("pagination.summary", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {tCommon("actions.prev")}
                </button>
                <span className="tabular-nums">{page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {tCommon("actions.next")}
                </button>
              </div>
            </div>
          </Card>
        )}
      </StaggerItem>
    </div>
  );
}