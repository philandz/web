"use client";

import { Clock } from "lucide-react";
import { useActivityQuery } from "@/modules/sharing/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ActivityLogListProps = {
  budgetId: string;
};

const ACTION_LABELS: Record<string, string> = {
  "expense.added": "added an expense",
  "expense.updated": "updated an expense",
  "expense.deleted": "deleted an expense",
  "comment.added": "commented",
  "settlement.marked": "marked a settlement",
  "participant.joined": "joined the budget",
  "participant.left": "left the budget",
  "participant.revoked": "was removed from the budget",
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 1) return `${days} days ago`;
  if (days === 1) return "yesterday";
  if (hours > 1) return `${hours} hours ago`;
  if (hours === 1) return "1 hour ago";
  if (minutes > 1) return `${minutes} minutes ago`;
  if (minutes === 1) return "1 minute ago";
  return "just now";
}

export function ActivityLogList({ budgetId }: ActivityLogListProps) {
  const { data: entries, isLoading } = useActivityQuery({ budgetId, limit: 50 });
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="No activity yet"
        description="Activity will appear here as the budget is used"
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Activity</span>
        <span className={cn("transition-transform", collapsed ? "-rotate-90" : "rotate-0")}>
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <UserAvatar
                name={entry.actorDisplayName}
                size={32}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{entry.actorDisplayName}</span>
                  {" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}