"use client";

import { useTranslations } from "next-intl";

import { PageErrorState } from "@/components/state/page-error-state";
import { useReportRouteErrorBoundary } from "@/lib/observability/use-report-route-error-boundary";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  const tAdmin = useTranslations("admin.states");
  const tCommon = useTranslations("common.actions");
  useReportRouteErrorBoundary("admin", error);

  return (
    <PageErrorState
      message={tAdmin("error")}
      action={
        <button className="rounded-lg border border-current/40 px-3 py-1.5 text-sm" onClick={reset}>
          {tCommon("retry")}
        </button>
      }
    />
  );
}
