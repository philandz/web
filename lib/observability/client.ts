import { noopObservabilityReporter } from "@/lib/observability/reporters/noop";
import { sanitizeObservabilityContext } from "@/lib/observability/sanitize";
import type { ObservabilityEventInput, ObservabilityReporter } from "@/lib/observability/types";

let activeReporter: ObservabilityReporter = noopObservabilityReporter;

export function setObservabilityReporter(reporter: ObservabilityReporter) {
  activeReporter = reporter;
}

export function reportObservabilityEvent(event: ObservabilityEventInput) {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
    context: sanitizeObservabilityContext(event.context)
  };

  try {
    const result = activeReporter.report(payload);
    if (result instanceof Promise) {
      result.catch(() => {
        return;
      });
    }
  } catch {
    return;
  }
}

export function toErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    value: error
  };
}
