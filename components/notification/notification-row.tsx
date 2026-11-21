"use client";

import {
  AlertTriangle,
  Archive,
  BellRing,
  Check,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { renderNotification, type Translator } from "@/modules/notification/render";
import type { InboxItem, NotificationCategory } from "@/services/notification-service";

export function formatWhen(epochSeconds: number, locale: string, now = Date.now()): string {
  const diff = Math.round((epochSeconds * 1000 - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(diff / 86_400), "day");
  return new Date(epochSeconds * 1000).toLocaleDateString(locale);
}

/** One icon and colour per category, so the inbox can be scanned by type. */
const CATEGORY_STYLE: Record<NotificationCategory, { icon: LucideIcon; tone: string }> = {
  reminder: { icon: BellRing, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  activity: { icon: MessageSquare, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  membership: { icon: Users, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  alert: { icon: AlertTriangle, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  security: { icon: ShieldAlert, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  system: { icon: Megaphone, tone: "bg-primary/10 text-primary" },
};

export function categoryStyle(item: Pick<InboxItem, "category" | "kind" | "severity">) {
  if (item.severity === "critical") {
    return { icon: AlertTriangle, tone: "bg-destructive/15 text-destructive" };
  }
  const key: NotificationCategory = item.kind === "system" ? "system" : item.category;
  return CATEGORY_STYLE[key] ?? CATEGORY_STYLE.activity;
}

function Leading({ item, size }: { item: InboxItem; size: number }) {
  const { icon: Icon, tone } = categoryStyle(item);
  if (item.actorName) {
    // A person did this: show who, with the category as a small badge.
    return (
      <span className="relative shrink-0">
        <UserAvatar name={item.actorName} size={size} fallbackClassName="text-[11px]" />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card ring-2 ring-card"
          )}
        >
          <span className={cn("inline-flex h-full w-full items-center justify-center rounded-full", tone)}>
            <Icon className="h-2.5 w-2.5" />
          </span>
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", tone)}
      style={{ width: size, height: size }}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Hover actions; phones have no hover, so there the row just opens (and the page has bulk actions).
const ACTION =
  "hidden rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 sm:inline-flex";

export function NotificationRow({
  item,
  onOpen,
  onArchive,
  onMarkRead,
  compact = false,
}: {
  item: InboxItem;
  onOpen: (item: InboxItem) => void;
  onArchive?: (item: InboxItem) => void;
  onMarkRead?: (item: InboxItem) => void;
  compact?: boolean;
}) {
  const t = useTranslations("notification");
  const locale = useLocale();
  const { title, body } = renderNotification(t as unknown as Translator, item);
  const unread = !item.isRead;

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-3 transition-colors hover:bg-muted/60",
        compact ? "py-2.5" : "py-3"
      )}
      data-testid="notification-row"
      data-read={item.isRead}
    >
      <Leading item={item} size={compact ? 34 : 38} />
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className={cn("text-sm leading-snug text-foreground", unread ? "font-semibold" : "font-normal opacity-80")}>
          {title}
        </p>
        {body ? (
          <p className={cn("mt-0.5 text-[13px] text-muted-foreground", compact ? "line-clamp-1" : "line-clamp-2")}>
            {body}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{formatWhen(item.createdAt, locale)}</p>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 self-center">
        {unread && onMarkRead ? (
          <button type="button" onClick={() => onMarkRead(item)} className={ACTION} aria-label={t("markRead")} title={t("markRead")}>
            <Check className="h-4 w-4" />
          </button>
        ) : null}
        {onArchive && item.severity !== "critical" ? (
          <button type="button" onClick={() => onArchive(item)} className={ACTION} aria-label={t("archive")} title={t("archive")}>
            <Archive className="h-4 w-4" />
          </button>
        ) : null}
        <span
          className={cn("ml-1 h-2 w-2 rounded-full", unread ? "bg-primary" : "bg-transparent")}
          aria-label={unread ? t("unread") : undefined}
          aria-hidden={unread ? undefined : true}
        />
      </div>
    </li>
  );
}
