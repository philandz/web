import type { ApiErrorShape, ApiFieldErrors } from "@/lib/http/types";

const defaultMessages: Record<number, string> = {
  400: "Invalid request",
  401: "Please sign in again",
  403: "You do not have permission for this action",
  404: "Resource not found",
  409: "Conflict detected",
  422: "Validation failed",
  429: "Too many requests",
  500: "Server error",
  503: "Service unavailable"
};

export class ApiError extends Error implements ApiErrorShape {
  code: string;
  status: number;
  fieldErrors?: ApiFieldErrors;
  details?: unknown;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.message = shape.message;
    this.code = shape.code;
    this.status = shape.status;
    this.fieldErrors = shape.fieldErrors;
    this.details = shape.details;
  }
}

function normalizeFieldErrors(input: unknown): ApiFieldErrors | undefined {
  if (!input || typeof input !== "object") return undefined;

  const entries: Array<[string, string[]]> = [];

  Object.entries(input as Record<string, unknown>).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      const texts = value.filter((item): item is string => typeof item === "string");
      if (texts.length) {
        entries.push([field, texts]);
      }
      return;
    }

    if (typeof value === "string") {
      entries.push([field, [value]]);
      return;
    }
  });

  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
}

function readMessage(payload: unknown, status: number, fallback?: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const direct = typeof record.message === "string" ? record.message : null;
    const nested =
      record.error && typeof record.error === "object" && typeof (record.error as Record<string, unknown>).message === "string"
        ? ((record.error as Record<string, unknown>).message as string)
        : null;

    if (direct) return direct;
    if (nested) return nested;
  }

  return fallback ?? defaultMessages[status] ?? "Request failed";
}

function readCode(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const direct = typeof record.code === "string" ? record.code : null;
    const nested =
      record.error && typeof record.error === "object" && typeof (record.error as Record<string, unknown>).code === "string"
        ? ((record.error as Record<string, unknown>).code as string)
        : null;

    if (direct) return direct;
    if (nested) return nested;
  }

  return `HTTP_${status}`;
}

function readFieldErrors(payload: unknown): ApiFieldErrors | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  return normalizeFieldErrors(record.field_errors) ?? normalizeFieldErrors(record.errors);
}

export function createApiError(status: number, payload: unknown, fallbackMessage?: string): ApiError {
  return new ApiError({
    status,
    code: readCode(payload, status),
    message: readMessage(payload, status, fallbackMessage),
    fieldErrors: readFieldErrors(payload),
    details: payload
  });
}

export function createNetworkError(details?: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message: "Network request failed",
    details
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 401;
}

export function isForbiddenError(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 403;
}

export function getValidationErrors(error: unknown): ApiFieldErrors | undefined {
  return isApiError(error) ? error.fieldErrors : undefined;
}

export function getFieldErrorMessage(error: unknown, field: string): string | undefined {
  const fieldErrors = getValidationErrors(error);
  if (!fieldErrors) return undefined;
  return fieldErrors[field]?.[0];
}

export function getUnexpectedServerErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!isApiError(error)) return fallback;
  if (error.status >= 500 || error.status === 0) return fallback;
  return error.message || fallback;
}
