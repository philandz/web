"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { readSharingSession } from "@/lib/sharing/session";

type GuestViewBannerProps = {
  budgetId: string;
  displayName?: string;
};

/**
 * Renders a dismissible info banner when the current user is viewing the
 * sharing budget as a guest (no auth token, but has a sharing session).
 * Shows the guest display name, a "Guest" badge, and a limitation notice.
 */
export function GuestViewBanner({ budgetId, displayName }: GuestViewBannerProps) {
  const t = useTranslations("sharing");
  const token = useAuthStore((s) => s.token);
  const hasSharingSession = readSharingSession(budgetId) !== null;
  const isGuest = !token && hasSharingSession;

  if (!isGuest) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex flex-wrap items-center gap-1">
        <span>
          {t("guest.banner", { name: displayName ?? t("guest.guestDefaultName") })}
        </span>
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-100/60 text-[10px] font-normal dark:border-amber-700 dark:bg-amber-900/40"
        >
          {t("guest.guestLabel")}
        </Badge>
        <span className="text-amber-600 dark:text-amber-400">
          {t("guest.limitation")}
        </span>
      </span>
    </div>
  );
}

