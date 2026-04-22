"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart2, CreditCard, LayoutGrid,
  PiggyBank, Plus, Search, Share2, Wallet,
} from "lucide-react";

import { BudgetCard } from "@/components/philand/budget-card";
import { CreateBudgetDialog } from "@/components/philand/create-budget-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
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
  const tenant = useTenantContext();

  const [showCreate, setShowCreate] = useState(false);
  const [params, setParams] = useState<Omit<BudgetListParams, "orgId">>({
    page: 1,
    pageSize: 20,
  });

  function update(patch: Partial<Omit<BudgetListParams, "orgId">>) {
    setParams((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  }

  const orgId = tenant.selectedOrgId ?? "";
  const { data: budgets = [], isLoading } = useBudgetsQuery({ ...params, orgId });

  // ── No org selected ──
  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Wallet className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-foreground">{t("noOrg")}</p>
      </div>
    );
  }

  const activeType = params.type ?? "";

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">{t("create")}</span>
        </Button>
      </div>

      {/* ── Toolbar ── */}
      <div className="space-y-2.5">
        {/* Row 1: search (full width) + secondary filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={params.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
              className="pl-9"
              placeholder={t("searchPlaceholder")}
            />
          </div>
          {/* Role + sort — visible on sm+, hidden on mobile to keep row clean */}
          <SelectNative
            value={params.role ?? ""}
            onValueChange={(v) => update({ role: (v as BudgetRole) || undefined })}
            className="hidden w-32 sm:block"
          >
            <option value="">{t("allRoles")}</option>
            <option value="owner">{t("roleOwner")}</option>
            <option value="manager">{t("roleManager")}</option>
            <option value="contributor">{t("roleContributor")}</option>
            <option value="viewer">{t("roleViewer")}</option>
          </SelectNative>
          <SelectNative
            value={params.sortBy ?? ""}
            onValueChange={(v) => update({ sortBy: v || undefined })}
            className="hidden w-32 sm:block"
          >
            <option value="">{t("sortDefault")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="updated_at">{t("sortUpdated")}</option>
          </SelectNative>
        </div>

        {/* Mobile-only: role + sort selects in a scrollable row */}
        <div className="flex gap-2 sm:hidden">
          <SelectNative
            value={params.role ?? ""}
            onValueChange={(v) => update({ role: (v as BudgetRole) || undefined })}
            className="flex-1"
          >
            <option value="">{t("allRoles")}</option>
            <option value="owner">{t("roleOwner")}</option>
            <option value="manager">{t("roleManager")}</option>
            <option value="contributor">{t("roleContributor")}</option>
            <option value="viewer">{t("roleViewer")}</option>
          </SelectNative>
          <SelectNative
            value={params.sortBy ?? ""}
            onValueChange={(v) => update({ sortBy: v || undefined })}
            className="flex-1"
          >
            <option value="">{t("sortDefault")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="updated_at">{t("sortUpdated")}</option>
          </SelectNative>
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
                  onClick={() => update({ type: (value as BudgetType) || undefined })}
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

          {/* Result count */}
          {!isLoading && budgets.length > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {budgets.length}&nbsp;{budgets.length === 1 ? "budget" : "budgets"}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Wallet className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{t("emptySubtitle")}</p>
          <Button size="sm" className="mt-5" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onClick={() => router.push(routes.budgetDetail(budget.id))}
            />
          ))}
        </div>
      )}

      <CreateBudgetDialog
        open={showCreate}
        orgId={orgId}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
