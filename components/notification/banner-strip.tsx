"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useArchiveMutation, useBannersQuery } from "@/modules/notification/hooks";

/** Active system-broadcast banners (critical ones cannot be dismissed). */
export function BannerStrip() {
  const t = useTranslations("notification");
  const locale = useLocale();
  const banners = useBannersQuery(locale);
  const dismiss = useArchiveMutation();

  if (!banners.data || banners.data.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="notification-banners">
      {banners.data.map((b) => (
        <div
          key={b.broadcastId}
          role={b.severity === "critical" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            b.severity === "critical"
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : b.severity === "warning"
                ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                : "border-border bg-muted/50 text-foreground"
          )}
        >
          {b.severity === "info" ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{b.title}</p>
            {b.body ? <p className="mt-0.5 text-xs opacity-90">{b.body}</p> : null}
            {b.link ? (
              <Link href={b.link} className="mt-1 inline-block text-xs font-medium underline">
                {t("learnMore")}
              </Link>
            ) : null}
          </div>
          {b.dismissible ? (
            <button
              type="button"
              onClick={() => dismiss.mutate({ broadcastIds: [b.broadcastId] })}
              className="shrink-0 rounded-md p-1 hover:bg-black/10"
              aria-label={t("dismiss")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
