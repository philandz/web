"use client";

import { BellRing, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/state/empty-state";
import { useToast } from "@/components/state/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isFeatureEnabled } from "@/lib/features";
import {
  usePreferencesQuery,
  useSetBudgetMuteMutation,
  useUpdatePreferencesMutation,
} from "@/modules/notification/hooks";
import { NOTIFICATION_CATEGORIES, type PreferenceCell } from "@/services/notification-service";

export default function NotificationSettingsPage() {
  const t = useTranslations("notification");
  const toast = useToast();
  const prefs = usePreferencesQuery();
  const update = useUpdatePreferencesMutation();
  const mute = useSetBudgetMuteMutation();

  if (!isFeatureEnabled("notifications")) {
    return <EmptyState title={t("disabledTitle")} description={t("disabledBody")} />;
  }

  // Phase 1 delivers in-app only; email/telegram columns appear when those channels ship.
  const cellFor = (category: string): PreferenceCell | undefined =>
    prefs.data?.cells.find((c) => c.category === category && c.channel === "in_app");

  function toggle(cell: PreferenceCell) {
    update.mutate([{ category: cell.category, channel: cell.channel, enabled: !cell.enabled }], {
      onError: () => toast.error(t("saveError")),
    });
  }

  return (
    <section className="space-y-5 animate-fade-in-up">
      <PageHeader title={t("settingsTitle")} description={t("settingsSubtitle")} icon={<BellRing className="h-5 w-5" />} />

      {prefs.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : prefs.isError ? (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => prefs.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      ) : (
        <>
          <article className="surface-panel rounded-2xl p-2 md:p-3">
            <ul className="divide-y divide-border/60">
              {NOTIFICATION_CATEGORIES.map((category) => {
                const cell = cellFor(category);
                if (!cell) return null;
                return (
                  <li key={category} className="flex items-center justify-between gap-4 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{t(`categories.${category}.label`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`categories.${category}.hint`)}</p>
                    </div>
                    {cell.locked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        {t("alwaysOn")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cell.enabled}
                        aria-label={t(`categories.${category}.label`)}
                        onClick={() => toggle(cell)}
                        disabled={update.isPending}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${cell.enabled ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${cell.enabled ? "left-[22px]" : "left-0.5"}`}
                        />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>

          {prefs.data && prefs.data.mutedBudgetIds.length > 0 ? (
            <article className="surface-panel rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-foreground">{t("mutedBudgets")}</h2>
              <ul className="mt-3 space-y-2">
                {prefs.data.mutedBudgetIds.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-3 text-sm">
                    <code className="truncate text-xs text-muted-foreground">{id}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mute.isPending}
                      onClick={() => mute.mutate({ budgetId: id, muted: false })}
                    >
                      {t("unmute")}
                    </Button>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </>
      )}
    </section>
  );
}
