"use client";

import { Bell, Settings2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationRow } from "@/components/notification/notification-row";
import { EmptyState } from "@/components/state/empty-state";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/navigation";
import { isFeatureEnabled } from "@/lib/features";
import { useArchiveMutation, useInboxQuery, useMarkAllReadMutation } from "@/modules/notification/hooks";
import { useOpenNotification } from "@/modules/notification/use-open-item";
import type { InboxItem } from "@/services/notification-service";

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const t = useTranslations("notification");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("all");
  const inbox = useInboxQuery({ filter: tab, locale });
  const markAll = useMarkAllReadMutation();
  const archive = useArchiveMutation();
  const openItem = useOpenNotification();

  if (!isFeatureEnabled("notifications")) {
    return <EmptyState title={t("disabledTitle")} description={t("disabledBody")} />;
  }

  const items = inbox.data?.pages.flatMap((p) => p.items) ?? [];

  function onArchive(item: InboxItem) {
    archive.mutate(item.kind === "system" ? { broadcastIds: [item.id] } : { itemIds: [item.id] });
  }

  return (
    <section className="space-y-5 animate-fade-in-up">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<Bell className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll.mutate(undefined)} disabled={markAll.isPending}>
              {t("markAllRead")}
            </Button>
            <Link href={routes.notificationSettings} aria-label={t("settings")}>
              <Button variant="ghost" size="sm">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <SegmentedControl
        className="max-w-xs"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: "all", label: t("tabAll") },
          { value: "unread", label: t("tabUnread") },
        ]}
      />

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
        <EmptyState title={tab === "unread" ? t("emptyUnread") : t("empty")} />
      ) : (
        <>
          <ul className="surface-panel space-y-0.5 rounded-2xl p-2">
            {items.map((item) => (
              <NotificationRow key={`${item.kind}-${item.id}`} item={item} onOpen={openItem} onArchive={onArchive} />
            ))}
          </ul>
          {inbox.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => inbox.fetchNextPage()} disabled={inbox.isFetchingNextPage}>
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
