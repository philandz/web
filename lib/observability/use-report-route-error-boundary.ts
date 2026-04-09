"use client";

import { useEffect } from "react";

import { reportObservabilityEvent, toErrorContext } from "@/lib/observability/client";

export function useReportRouteErrorBoundary(area: string, error: Error) {
  useEffect(() => {
    reportObservabilityEvent({
      type: "ui_error",
      severity: "error",
      message: `${area} route error boundary triggered`,
      context: {
        area,
        error: toErrorContext(error)
      }
    });
  }, [area, error]);
}
