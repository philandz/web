import type { ObservabilityReporter } from "@/lib/observability/types";

export const noopObservabilityReporter: ObservabilityReporter = {
  report: () => {
    return;
  }
};
