"use client";

import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationRow } from "@/components/notification/notification-row";
import { EmptyState } from "@/components/state/empty-state";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/navigation";
import { isFeatureEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";
import { groupByDay } from "@/modules/notification/group";
import {
  useArchiveMutation,
  useInboxQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useUnreadCountQuery,
} from "@/modules/notification/hooks";
import { useOpenNotification } from "@/modules/notification/use-open-item";
import type { InboxItem, NotificationCategory } from "@/services/notification-service";

type Tab = "all" | "unread";

/** Filter chips, in the order people look for them. */
const CATEGORIES: NotificationCategory[] = ["reminder", "activity", "membership", "alert", "system"];

const idsOf = (item: InboxItem) => (item.kind === "system" ? { broadcastIds: [item.id] } : { itemIds: [item.id] });

export default function NotificationsPage() {
  const t = useTranslations("notification");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<NotificationCategory | undefined>(undefined);
  const inbox = useInboxQuery({ filter: tab, category, locale });
  const unread = useUnreadCountQuery();
  const markAll = useMarkAllReadMutation();
  const markRead = useMarkReadMutation();
  const archive = useArchiveMutation();
  const openItem = useOpenNotification();

  const items = useMemo(() => inbox.data?.pages.flatMap((p) => p.items) ?? [], [inbox.data]);
  const groups = useMemo(() => groupByDay(items), [items]);

  if (!isFeatureEnabled("notifications")) {
    return <EmptyState title={t("disabledTitle")} description={t("disabledBody")} />;
  }

  const unreadTotal = unread.data?.total ?? 0;
  const emptyTitle = category ? t("emptyCategory") : tab === "unread" ? t("emptyUnread") : t("empty");

  return (
    <section className="space-y-5 animate-fade-in-up">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<Bell className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate(undefined)}
              disabled={markAll.isPending || unreadTotal === 0}
            >
              <CheckCheck className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t("markAllRead")}</span>
            </Button>
            <Link href={routes.notificationSettings} aria-label={t("settings")} title={t("settings")}>
              <Button variant="ghost" size="sm">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-3">
        <SegmentedControl
          className="max-w-xs"
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: "all", label: t("tabAll") },
            { value: "unread", label: unreadTotal > 0 ? `${t("tabUnread")} (${unreadTotal})` : t("tabUnread") },
          ]}
        />
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label={t("filterAll")}
          data-testid="notification-filters"
        >
          {[undefined, ...CATEGORIES].map((c) => {
            const active = c === category;
            return (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {c ? t(`categories.${c}.label`) : t("filterAll")}
              </button>
            );
          })}
        </div>
      </div>

      {inbox.isLoading ? (
        <div className="space-y-2" role="status" aria-label={t("loading")}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : inbox.isError ? (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => inbox.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} description={tab === "all" && !category ? t("emptyHint") : undefined} />
      ) : (
        <div className="space-y-5">
          {groups.map(({ group, items: list }) => (
            <div key={group} className="space-y-1.5">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`groups.${group}`)}
              </h2>
              <ul className="surface-panel divide-y divide-border/50 rounded-2xl p-1.5">
                {list.map((item) => (
                  <NotificationRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    onOpen={openItem}
                    onMarkRead={(i) => markRead.mutate(idsOf(i))}
                    onArchive={(i) => archive.mutate(idsOf(i))}
                  />
                ))}
              </ul>
            </div>
          ))}
          {inbox.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => inbox.fetchNextPage()} disabled={inbox.isFetchingNextPage}>
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
