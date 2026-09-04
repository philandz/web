"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Search, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { InlineAlert } from "@/components/state/inline-alert";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormInput } from "@/components/form/form-input";
import { SelectNative } from "@/components/ui/select";
import { useAdminBudgetsQuery, useAdminOrgsQuery } from "@/modules/admin/hooks";
import { sharingService } from "@/services/sharing-service";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatCurrency, useFormatLocale } from "@/lib/format";
import type { ActivityLogEntry, ParticipantInfo } from "@/services/sharing-service";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type SharingFilterValues = {
  orgId: string;
  nameSearch: string;
  dateFrom: string;
  dateTo: string;
  actionType: string;
};

// ---------------------------------------------------------------------------
// Activity type badge
// ---------------------------------------------------------------------------

function ActionBadge({ action, t }: { action: string; t: ReturnType<typeof useTranslations> }) {
  const isDestructive = action.includes("DELETE") || action.includes("REMOVE");
  const isCreate = action.includes("CREATE") || action.includes("ADD");
  const variant: "default" | "outline" | "secondary" = isCreate ? "default" : isDestructive ? "secondary" : "outline";

  return (
    <Badge
      variant={variant}
      className={cn("capitalize", isDestructive && "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400")}
    >
      {action.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Expanded budget detail (members + activity)
// ---------------------------------------------------------------------------

function BudgetDetail({
  budgetId,
  budgetCurrency,
  locale,
  t,
  dateFromUnix,
  dateToUnix,
  actorUserId,
  actionType,
}: {
  budgetId: string;
  budgetCurrency: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  dateFromUnix?: number;
  dateToUnix?: number;
  actorUserId?: string;
  actionType?: string;
}) {
  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ["sharing-participants", budgetId],
    queryFn: () => sharingService.listParticipants(budgetId),
    enabled: true,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["sharing-activity", budgetId, dateFromUnix, dateToUnix, actionType],
    queryFn: () => sharingService.listActivity({ budgetId, limit: 20, dateFromUnix, dateToUnix, action: actionType }),
    enabled: true,
  });

  const activities: ActivityLogEntry[] = activityData ?? [];
  const members: ParticipantInfo[] = participants ?? [];

  return (
    <div className="space-y-4 border-t border-border/60 bg-muted/20 p-4">
      {/* Members */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("members")} ({members.length})
        </h4>
        {participantsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="pb-1 pr-4 font-medium">{t("memberName")}</th>
                  <th className="pb-1 pr-4 font-medium">{t("memberKind")}</th>
                  <th className="pb-1 pr-4 font-medium">{t("joinedAt")}</th>
                  <th className="pb-1 font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const joined = m.joinedAt
                    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                        dateStyle: "short",
                      }).format(new Date(m.joinedAt < 1e12 ? m.joinedAt * 1000 : m.joinedAt))
                    : "—";
                  return (
                    <tr key={m.participantId} className="border-b border-border/30 last:border-b-0">
                      <td className="pr-4 py-1.5 font-medium text-foreground">{m.displayName}</td>
                      <td className="pr-4 py-1.5 text-muted-foreground">
                        {typeof m.kind === "number" ? m.kind : m.kind}
                      </td>
                      <td className="pr-4 py-1.5 text-muted-foreground">{joined}</td>
                      <td className="py-1.5">
                        {m.revoked ? (
                          <Badge variant="secondary" className="text-xs border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">{t("revoked")}</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">{t("active")}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("activity")} ({activities.length})
        </h4>
        {activityLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="pb-1 pr-4 font-medium">{t("when")}</th>
                  <th className="pb-1 pr-4 font-medium">{t("action")}</th>
                  <th className="pb-1 pr-4 font-medium">{t("actor")}</th>
                  <th className="pb-1 font-medium">{t("details")}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => {
                  const ts = a.createdAt < 1e12 ? a.createdAt * 1000 : a.createdAt;
                  const timeStr = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(ts));
                  let details = "";
                  try {
                    const p = JSON.parse(a.metadataJson);
                    details = p.note ?? p.description ?? a.metadataJson;
                  } catch {
                    details = a.metadataJson;
                  }
                  return (
                    <tr key={a.id} className="border-b border-border/30 last:border-b-0">
                      <td className="pr-4 py-1.5 text-muted-foreground">{timeStr}</td>
                      <td className="pr-4 py-1.5">
                        <ActionBadge action={a.action} t={t} />
                      </td>
                      <td className="pr-4 py-1.5 text-muted-foreground">{a.actorDisplayName}</td>
                      <td className="py-1.5 text-muted-foreground max-w-xs truncate">{details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budget row
// ---------------------------------------------------------------------------

function SharingBudgetRow({
  budget,
  orgName,
  locale,
  t,
  dateFromUnix,
  dateToUnix,
  actorUserId,
  actionType,
}: {
  budget: { id: string; name: string; currency: string; memberCount: number; updatedAt: number };
  orgName: string | undefined;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  dateFromUnix?: number;
  dateToUnix?: number;
  actorUserId?: string;
  actionType?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const lastActivity = budget.updatedAt
    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(budget.updatedAt < 1e12 ? budget.updatedAt * 1000 : budget.updatedAt))
    : "—";

  return (
    <>
      <tr
        className="border-b border-border/60 cursor-pointer hover:bg-muted/40 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {orgName ?? <span className="font-mono text-xs">{budget.id.slice(0, 8)}</span>}
        </td>
        <td className="px-4 py-3 font-medium text-foreground">{budget.name}</td>
        <td className="px-4 py-3">
          <Badge variant="outline" className="capitalize">sharing</Badge>
        </td>
        <td className="px-4 py-3 tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {budget.memberCount}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{lastActivity}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/60">
          <td colSpan={6} className="p-0">
            <BudgetDetail
              budgetId={budget.id}
              budgetCurrency={budget.currency}
              locale={locale}
              t={t}
              dateFromUnix={dateFromUnix}
              dateToUnix={dateToUnix}
              actorUserId={actorUserId}
              actionType={actionType}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Filter bar (stub: filter UI present, backend filter not yet wired)
// ---------------------------------------------------------------------------

function FilterBar({
  values,
  onChange,
  orgs,
  t,
}: {
  values: SharingFilterValues;
  onChange: (v: SharingFilterValues) => void;
  orgs: { id: string; name: string }[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Card className="surface-panel">
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-[1fr_200px_160px_160px_180px_auto]">
          <FormInput
            id="filter-name"
            label={t("filter.name")}
            placeholder={t("filter.namePlaceholder")}
            value={values.nameSearch}
            onChange={(e) => onChange({ ...values, nameSearch: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("filter.org")}
            </label>
            <SelectNative
              value={values.orgId}
              onValueChange={(v) => onChange({ ...values, orgId: v })}
            >
              <option value="">{t("filter.allOrgs")}</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("filter.fromDate")}
            </label>
            <input
              type="date"
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={values.dateFrom}
              onChange={(e) => onChange({ ...values, dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("filter.toDate")}
            </label>
            <input
              type="date"
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={values.dateTo}
              onChange={(e) => onChange({ ...values, dateTo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("filter.actionType")}
            </label>
            <SelectNative
              value={values.actionType}
              onValueChange={(v) => onChange({ ...values, actionType: v })}
            >
              <option value="">{t("filter.allActions")}</option>
              <option value="EXPENSE_CREATED">{t("filter.actionExpenseCreated")}</option>
              <option value="EXPENSE_DELETED">{t("filter.actionExpenseDeleted")}</option>
              <option value="MEMBER_ADDED">{t("filter.actionMemberAdded")}</option>
              <option value="MEMBER_REMOVED">{t("filter.actionMemberRemoved")}</option>
              <option value="SETTLEMENT">{t("filter.actionSettlement")}</option>
            </SelectNative>
          </div>
        </div>
        {/* Filter note */}
        <p className="text-xs text-muted-foreground">
          {t("filter.note")}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSharingPage() {
  const t = useTranslations("admin.sharing");
  const locale = useFormatLocale();
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [filters, setFilters] = useState<SharingFilterValues>({
    orgId: "",
    nameSearch: "",
    dateFrom: "",
    dateTo: "",
    actionType: "",
  });

  const { data: orgsData } = useAdminOrgsQuery({ pageSize: 100 });
  const orgs = useMemo(() => orgsData?.items ?? [], [orgsData?.items]);
  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs) m.set(o.id, o.name);
    return m;
  }, [orgs]);

  // Note: backend does not yet support activity filtering — dateFrom/dateTo/actionType
  // are UI-only filters; the query always fetches all sharing budgets.
  const query = useAdminBudgetsQuery({
    budgetType: "sharing",
    orgId: filters.orgId || undefined,
    nameSearch: filters.nameSearch || undefined,
    page,
    pageSize,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Client-side date + action type filter (applied after fetch)
  // Note: these are stub filters — the backend does not yet support date/action
  // filtering on the admin sharing list. UI is fully wired; backend is stub.
  const budgets = useMemo(() => {
    let result = query.data?.budgets ?? [];

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      result = result.filter((b) => b.updatedAt >= from / 1000);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime();
      result = result.filter((b) => b.updatedAt <= to / 1000);
    }

    return result;
  }, [query.data?.budgets, filters.dateFrom, filters.dateTo]);

  return (
    <div className="space-y-6">
      <StaggerItem delay={0}>
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          eyebrow={t("badge")}
          icon={<Users className="h-5 w-5" />}
          actions={
            <Badge className="bg-highlight text-slate-900">
              {t("total", { count: total })}
            </Badge>
          }
        />
      </StaggerItem>

      <StaggerItem delay={40}>
        <FilterBar
          values={filters}
          onChange={(v) => { setFilters(v); setPage(1); }}
          orgs={orgs}
          t={t}
        />
      </StaggerItem>

      <StaggerItem delay={80}>
        {query.isError ? (
          <InlineAlert tone="error">{t("loadError")}</InlineAlert>
        ) : query.isLoading ? (
          <SectionLoadingState message={t("loading")} />
        ) : budgets.length === 0 ? (
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
                    <th className="px-4 py-3 w-8" />
                    <th className="px-4 py-3">{t("column.org")}</th>
                    <th className="px-4 py-3">{t("column.name")}</th>
                    <th className="px-4 py-3">{t("column.type")}</th>
                    <th className="px-4 py-3">{t("column.members")}</th>
                    <th className="px-4 py-3">{t("column.lastActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <SharingBudgetRow
                      key={b.id}
                      budget={b}
                      orgName={orgNameById.get(b.orgId)}
                      locale={locale}
                      t={t}
                      dateFromUnix={filters.dateFrom ? Math.floor(new Date(filters.dateFrom).getTime() / 1000) : undefined}
                      dateToUnix={filters.dateTo ? Math.floor(new Date(filters.dateTo).getTime() / 1000) : undefined}
                      actorUserId={undefined}
                      actionType={filters.actionType || undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {t("pagination.summary", {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, total),
                  total,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("pagination.prev")}
                </Button>
                <span className="tabular-nums">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </StaggerItem>
    </div>
  );
}
