const REDACTED = "[REDACTED]";
const MAX_DEPTH = 5;

const SENSITIVE_KEY_PATTERN = /(authorization|password|token|secret|cookie|api[-_]?key|refresh)/i;
const SENSITIVE_VALUE_PATTERN = /(bearer\s+[a-z0-9\-._~+/]+=*)/gi;

function sanitizeString(value: string) {
  return value.replace(SENSITIVE_VALUE_PATTERN, "Bearer [REDACTED]");
}

function sanitizeObject(input: Record<string, unknown>, depth: number): Record<string, unknown> {
  if (depth > MAX_DEPTH) {
    return { truncated: true };
  }

  const entries = Object.entries(input).map(([key, value]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return [key, REDACTED] as const;
    }

    return [key, sanitizeObservabilityValue(value, depth + 1)] as const;
  });

  return Object.fromEntries(entries);
}

export function sanitizeObservabilityValue(input: unknown, depth = 0): unknown {
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    return sanitizeString(input);
  }

  if (typeof input === "number" || typeof input === "boolean") {
    return input;
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (Array.isArray(input)) {
    if (depth > MAX_DEPTH) {
      return ["[TRUNCATED]"];
    }

    return input.map((value) => sanitizeObservabilityValue(value, depth + 1));
  }

  if (typeof input === "object") {
    return sanitizeObject(input as Record<string, unknown>, depth);
  }

  return String(input);
}

export function sanitizeObservabilityContext(context?: Record<string, unknown>) {
  if (!context) return undefined;
  return sanitizeObservabilityValue(context) as Record<string, unknown>;
}
