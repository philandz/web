export type ObservabilitySeverity = "info" | "warning" | "error";

export type ObservabilityEventType =
  | "ui_error"
  | "api_error"
  | "action_failure"
  | "global_error"
  | "unhandled_rejection";

export interface ObservabilityEvent {
  type: ObservabilityEventType;
  severity: ObservabilitySeverity;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface ObservabilityReporter {
  report: (event: ObservabilityEvent) => void | Promise<void>;
}

export interface ObservabilityEventInput {
  type: ObservabilityEventType;
  severity: ObservabilitySeverity;
  message: string;
  context?: Record<string, unknown>;
}
