"use client";

import { useTranslations } from "next-intl";

import { PageErrorState } from "@/components/state/page-error-state";
import { useReportRouteErrorBoundary } from "@/lib/observability/use-report-route-error-boundary";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const tDashboard = useTranslations("dashboard.states");
  const tCommon = useTranslations("common.actions");
  useReportRouteErrorBoundary("dashboard", error);

  return (
    <PageErrorState
      message={tDashboard("error")}
      action={
        <button className="rounded-lg border border-current/40 px-3 py-1.5 text-sm" onClick={reset}>
          {tCommon("retry")}
        </button>
      }
    />
  );
}
