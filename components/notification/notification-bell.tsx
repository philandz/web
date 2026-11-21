"use client";

import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { NotificationRow } from "@/components/notification/notification-row";
import { Popover } from "@/components/ui/popover";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/navigation";
import {
  useArchiveMutation,
  useInboxQuery,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useUnreadCountQuery,
} from "@/modules/notification/hooks";
import { useOpenNotification } from "@/modules/notification/use-open-item";
import type { InboxItem } from "@/services/notification-service";

const PREVIEW_LIMIT = 8;

export function NotificationBell() {
  const t = useTranslations("notification");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCountQuery();
  const inbox = useInboxQuery({ filter: "all", locale }, PREVIEW_LIMIT);
  const markAll = useMarkAllReadMutation();
  const archive = useArchiveMutation();
  const markRead = useMarkReadMutation();
  const openItem = useOpenNotification(() => setOpen(false));

  const total = unread.data?.total ?? 0;
  const items = open ? (inbox.data?.pages[0]?.items ?? []) : [];

  function onArchive(item: InboxItem) {
    archive.mutate(item.kind === "system" ? { broadcastIds: [item.id] } : { itemIds: [item.id] });
  }

  const trigger = (
    <button
      type="button"
      className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={total > 0 ? t("bellWithCount", { count: total }) : t("bell")}
      data-testid="notification-bell"
    >
      <Bell className="h-5 w-5" />
      {total > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-white"
          data-testid="notification-badge"
        >
          {total > 99 ? "99+" : total}
        </span>
      ) : null}
    </button>
  );

  return (
    <Popover trigger={trigger} open={open} onOpenChange={setOpen} align="end" sideOffset={8}>
      <div className="w-[min(92vw,380px)]" data-testid="notification-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <button
            type="button"
            disabled={total === 0 || markAll.isPending}
            onClick={() => markAll.mutate(undefined)}
            className="text-xs font-medium text-primary disabled:opacity-40"
          >
            {t("markAllRead")}
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {inbox.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground" role="status">
              {t("loading")}
            </p>
          ) : inbox.isError ? (
            <p className="px-3 py-6 text-center text-sm text-destructive" role="alert">
              {t("loadError")}
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">
              {t("empty")}
            </p>
          ) : (
            <ul className="space-y-0.5 p-1">
              {items.map((item) => (
                <NotificationRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onOpen={openItem}
                  onArchive={onArchive}
                  onMarkRead={(i) => markRead.mutate(i.kind === "system" ? { broadcastIds: [i.id] } : { itemIds: [i.id] })}
                  compact
                />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border/60 px-3 py-2 text-center">
          <Link href={routes.notifications} onClick={() => setOpen(false)} className="text-xs font-medium text-primary">
            {t("viewAll")}
          </Link>
        </div>
      </div>
    </Popover>
  );
}
