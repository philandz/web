"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpDown,
  BarChart2, CreditCard, LayoutGrid,
  PiggyBank, Plus, Search, Share2, Wallet,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/philand/data-table";
import { BudgetCard } from "@/components/philand/budget-card";
import { CreateBudgetDialog } from "@/components/philand/create-budget-dialog";
import { EmptyState } from "@/components/state/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { routes } from "@/constants/routes";
import {
  changeBudgetFilter,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIR,
  parseBudgetFilters,
  serializeBudgetFilters,
  type BudgetFilters,
} from "@/lib/query-params/budgets";
import { useBudgetsQuery } from "@/modules/budget/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import type { BudgetListParams, BudgetRole, BudgetType } from "@/services/budget-service";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Type quick-filter definitions (matches TYPE_CONFIG in budget-card.tsx)
// ---------------------------------------------------------------------------

const TYPE_CHIPS: { value: BudgetType | ""; Icon?: React.ElementType; labelKey: string }[] = [
  { value: "",          labelKey: "allTypes"      },
  { value: "standard",  Icon: LayoutGrid, labelKey: "typeStandard" },
  { value: "saving",    Icon: PiggyBank,  labelKey: "typeSaving"   },
  { value: "debt",      Icon: CreditCard, labelKey: "typeDebt"     },
  { value: "invest",    Icon: BarChart2,  labelKey: "typeInvest"   },
  { value: "sharing",   Icon: Share2,     labelKey: "typeSharing"  },
];

// ---------------------------------------------------------------------------
// Skeleton card (same visual structure as BudgetCard)
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/90 bg-card overflow-hidden animate-pulse">
      <div className="h-0.5 w-full bg-muted-foreground/20" />
      <div className="p-5 pt-4 flex flex-col gap-0">
        {/* header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted" />
              <div className="h-2.5 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="h-5 w-14 rounded-full bg-muted" />
        </div>
        {/* metric */}
        <div className="mt-4 space-y-1.5">
          <div className="h-2.5 w-12 rounded bg-muted" />
          <div className="h-6 w-36 rounded bg-muted" />
        </div>
        {/* progress */}
        <div className="mt-4 space-y-1.5">
          <div className="h-4 w-full rounded bg-transparent" />
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </div>
        {/* footer */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-muted" />
          <div className="h-2.5 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BudgetsPage() {
  const t = useTranslations("budget.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenant = useTenantContext();

  const [showCreate, setShowCreate] = useState(false);

  const filters = parseBudgetFilters(searchParams);

  function updateFilters(patch: Partial<Omit<BudgetFilters, "page">>) {
    const next = changeBudgetFilter(filters, patch);
    const params = serializeBudgetFilters(next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setPage(page: number) {
    const next = { ...filters, page };
    const params = serializeBudgetFilters(next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setPageSize(pageSize: number) {
    const next = { ...filters, pageSize };
    const params = serializeBudgetFilters(next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const orgId = tenant.selectedOrgId ?? "";

  const listParams: BudgetListParams = {
    ...filters,
    orgId,
  };

  const { data, isLoading, isError, refetch } = useBudgetsQuery(listParams);
  const budgets = data?.items ?? [];
  const meta = data?.meta;

  // ── No org selected ──
  if (!orgId) {
    return (
      <EmptyState title={t("noOrg")} />
    );
  }

  const activeType = filters.type ?? "";

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Page header ── */}
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<Wallet className="h-5 w-5" />}
        actions={(
          <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{t("create")}</span>
          </Button>
        )}
      />

      {/* ── Toolbar ── */}
      <div className="space-y-2.5">
        {/* Row 1: search (full width) + secondary filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q ?? ""}
              onChange={(e) => updateFilters({ q: e.target.value || undefined })}
              className="pl-9"
              placeholder={t("searchPlaceholder")}
            />
          </div>
          {/* Role + sort — visible on sm+, hidden on mobile to keep row clean */}
          <SelectNative
            value={filters.role ?? ""}
            onValueChange={(v) => updateFilters({ role: (v as BudgetRole) || undefined })}
            className="hidden w-32 sm:block"
          >
            <option value="">{t("allRoles")}</option>
            <option value="owner">{t("roleOwner")}</option>
            <option value="manager">{t("roleManager")}</option>
            <option value="contributor">{t("roleContributor")}</option>
            <option value="viewer">{t("roleViewer")}</option>
          </SelectNative>
          <SelectNative
            value={filters.sortBy ?? ""}
            onValueChange={(v) => updateFilters({ sortBy: (v as BudgetFilters["sortBy"]) || undefined })}
            className="hidden w-32 sm:block"
          >
            <option value="">{t("sortDefault")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="updated_at">{t("sortUpdated")}</option>
          </SelectNative>
          {/* Sort direction toggle */}
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 w-9 sm:flex"
            onClick={() => updateFilters({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })}
            title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile-only: role + sort selects in a scrollable row */}
        <div className="flex gap-2 sm:hidden">
          <SelectNative
            value={filters.role ?? ""}
            onValueChange={(v) => updateFilters({ role: (v as BudgetRole) || undefined })}
            className="flex-1"
          >
            <option value="">{t("allRoles")}</option>
            <option value="owner">{t("roleOwner")}</option>
            <option value="manager">{t("roleManager")}</option>
            <option value="contributor">{t("roleContributor")}</option>
            <option value="viewer">{t("roleViewer")}</option>
          </SelectNative>
          <SelectNative
            value={filters.sortBy ?? ""}
            onValueChange={(v) => updateFilters({ sortBy: (v as BudgetFilters["sortBy"]) || undefined })}
            className="flex-1"
          >
            <option value="">{t("sortDefault")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="updated_at">{t("sortUpdated")}</option>
          </SelectNative>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 shrink-0 px-0"
            onClick={() => updateFilters({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Row 2: type quick-filter chips — horizontally scrollable, no wrap */}
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
            {TYPE_CHIPS.map(({ value, Icon, labelKey }) => {
              const active = activeType === value;
              return (
                <button
                  key={value || "all"}
                  type="button"
                  onClick={() => updateFilters({ type: (value as BudgetType) || undefined })}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    "transition-all duration-150",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" strokeWidth={1.8} />}
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          {/* Result count from meta */}
          {!isLoading && meta && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t("count", { count: meta.totalRows })}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {isError ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptySubtitle")}
          action={(
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {t("refresh")}
            </Button>
          )}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptySubtitle")}
          action={(
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("create")}
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onClick={() =>
                router.push(
                  budget.type === "sharing"
                    ? routes.sharingDetail(budget.id)
                    : routes.budgetDetail(budget.id),
                )
              }
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalRows={meta.totalRows}
          pageSize={meta.pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <CreateBudgetDialog
        open={showCreate}
        orgId={orgId}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
