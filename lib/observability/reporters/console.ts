import type { ObservabilityEvent, ObservabilityReporter } from "@/lib/observability/types";

function toPayload(event: ObservabilityEvent) {
  return {
    timestamp: event.timestamp,
    type: event.type,
    context: event.context
  };
}

export const consoleObservabilityReporter: ObservabilityReporter = {
  report: (event) => {
    if (event.severity === "error") {
      console.error(event.message, toPayload(event));
      return;
    }

    if (event.severity === "warning") {
      console.warn(event.message, toPayload(event));
      return;
    }

    console.info(event.message, toPayload(event));
  }
};
