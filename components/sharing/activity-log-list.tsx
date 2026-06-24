"use client";

import { useTranslations } from "next-intl";
import { useActivityQuery } from "@/modules/sharing/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/services/sharing-service";

type ActivityLogListProps = {
  budgetId: string;
};

const ACTION_DOT: Record<string, string> = {
  "expense.added": "bg-emerald-500",
  "expense.updated": "bg-amber-500",
  "expense.deleted": "bg-rose-500",
  "comment.added": "bg-sky-500",
  "comment.deleted": "bg-rose-500",
  "settlement.marked": "bg-accent",
  "participant.joined": "bg-primary",
  "participant.left": "bg-muted-foreground",
  "participant.revoked": "bg-rose-500",
};

const ACTION_KEY: Record<string, string> = {
  "expense.added": "expenseAdded",
  "expense.updated": "expenseUpdated",
  "expense.deleted": "expenseDeleted",
  "comment.added": "commentAdded",
  "comment.deleted": "commentDeleted",
  "settlement.marked": "settlementAdded",
  "participant.joined": "participantJoined",
  "participant.left": "participantLeft",
  "participant.revoked": "participantRevoked",
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function ActivityLogList({ budgetId }: ActivityLogListProps) {
  const t = useTranslations("sharing");
  const { data: entries, isLoading } = useActivityQuery({ budgetId, limit: 50 });

  if (isLoading) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <History className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {t("activity.title")}
          </h3>
        </header>
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title={t("activity.activityEmpty")}
          description={t("activity.activityEmptyHint")}
        />
      </section>
    );
  }

  return (
    <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
          <History className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {t("activity.title")}
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {entries.length}
        </span>
      </header>

      <ol className="relative ml-4 border-l border-border/60 pl-5">
        {entries.map((entry: ActivityLogEntry) => {
          const dotClass = ACTION_DOT[entry.action] ?? "bg-muted-foreground";
          const key = ACTION_KEY[entry.action];
          const label = key
            ? t(`activity.${key}` as any, { actor: entry.actorDisplayName })
            : entry.action;
          return (
            <li key={entry.id} className="relative pb-4 last:pb-0">
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                  dotClass,
                )}
              />
              <div className="flex items-start gap-2">
                <UserAvatar
                  name={entry.actorDisplayName}
                  size={28}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}