"use client";

import { AlertTriangle, Archive, Bell, Megaphone, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { renderNotification, type Translator } from "@/modules/notification/render";
import type { InboxItem } from "@/services/notification-service";

function formatWhen(epochSeconds: number, locale: string): string {
  const diff = Math.round((epochSeconds * 1000 - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(diff / 86_400), "day");
  return new Date(epochSeconds * 1000).toLocaleDateString(locale);
}

function Icon({ item }: { item: InboxItem }) {
  const cls = "h-4 w-4";
  if (item.category === "security") return <ShieldAlert className={cls} />;
  if (item.severity === "critical" || item.severity === "warning") return <AlertTriangle className={cls} />;
  if (item.kind === "system") return <Megaphone className={cls} />;
  return <Bell className={cls} />;
}

export function NotificationRow({
  item,
  onOpen,
  onArchive,
  compact = false,
}: {
  item: InboxItem;
  onOpen: (item: InboxItem) => void;
  onArchive?: (item: InboxItem) => void;
  compact?: boolean;
}) {
  const t = useTranslations("notification");
  const locale = useLocale();
  const { title, body } = renderNotification(t as unknown as Translator, item);
  const tone =
    item.severity === "critical"
      ? "bg-destructive/15 text-destructive"
      : item.severity === "warning"
        ? "bg-amber-500/15 text-amber-500"
        : "bg-muted text-muted-foreground";

  return (
    <li
      className={cn(
        "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60",
        !item.isRead && "bg-highlight/10"
      )}
      data-testid="notification-row"
      data-read={item.isRead}
    >
      <span className={cn("mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon item={item} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        <p className={cn("text-sm text-foreground", !item.isRead ? "font-semibold" : "font-medium")}>{title}</p>
        {body && !compact ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body}</p> : null}
        <p className="mt-1 text-[11px] text-muted-foreground">{formatWhen(item.createdAt, locale)}</p>
      </button>
      {!item.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t("unread")} />
      ) : null}
      {onArchive && item.severity !== "critical" ? (
        <button
          type="button"
          onClick={() => onArchive(item)}
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={t("archive")}
        >
          <Archive className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
