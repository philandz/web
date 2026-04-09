import { createApiError, createNetworkError, isForbiddenError, isUnauthorizedError, type ApiError } from "@/lib/http/errors";
import type { RequestMetadata } from "@/lib/http/types";
import { reportObservabilityEvent } from "@/lib/observability/client";

type RequestContext = {
  path: string;
  url: string;
  init: RequestInit;
  metadata: RequestMetadata;
};

type RequestInterceptor = (context: RequestContext) => Promise<RequestContext> | RequestContext;
type ErrorInterceptor = (error: ApiError, context: RequestContext) => Promise<void> | void;

type AuthHandlers = {
  getToken?: () => string | null;
  onUnauthorized?: (error: ApiError) => void;
  onForbidden?: (error: ApiError) => void;
};

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:9000").replace(/\/$/, "");

function reportHttpError(error: ApiError, context: RequestContext) {
  reportObservabilityEvent({
    type: "api_error",
    severity: "error",
    message: error.message,
    context: {
      path: context.path,
      method: context.init.method ?? "GET",
      requestId: context.metadata.requestId,
      durationMs: Date.now() - context.metadata.startedAt,
      code: error.code,
      status: error.status,
      fieldErrors: error.fieldErrors,
      details: error.details
    }
  });
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withDefaultHeaders(headers?: HeadersInit): Headers {
  const normalized = new Headers(headers);
  if (!normalized.has("Content-Type")) {
    normalized.set("Content-Type", "application/json");
  }

  return normalized;
}

async function parseResponsePayload(response: Response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as Record<string, unknown>).data as T;
  }

  return payload as T;
}

class ApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private authHandlers: AuthHandlers = {};

  constructor(private readonly baseUrl: string) {
    this.useRequest(async (context) => {
      const headers = withDefaultHeaders(context.init.headers);
      const token = this.authHandlers.getToken?.();

      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("X-Request-Id", context.metadata.requestId);
      headers.set("X-Client-Source", context.metadata.source);

      return {
        ...context,
        init: {
          ...context.init,
          headers
        }
      };
    });

    this.useError((error) => {
      if (isUnauthorizedError(error)) {
        this.authHandlers.onUnauthorized?.(error);
      }

      if (isForbiddenError(error)) {
        this.authHandlers.onForbidden?.(error);
      }
    });
  }

  configureAuthHandlers(handlers: AuthHandlers) {
    this.authHandlers = {
      ...this.authHandlers,
      ...handlers
    };
  }

  useRequest(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  useError(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
  }

  async request<T>(path: string, options?: RequestOptions): Promise<T> {
    let context: RequestContext = {
      path,
      url: `${this.baseUrl}${path}`,
      init: {
        method: options?.method ?? "GET",
        headers: options?.headers,
        signal: options?.signal,
        credentials: options?.credentials,
        cache: options?.cache,
        redirect: options?.redirect,
        referrerPolicy: options?.referrerPolicy,
        keepalive: options?.keepalive,
        mode: options?.mode
      },
      metadata: {
        requestId: createRequestId(),
        startedAt: Date.now(),
        source: "philand-web"
      }
    };

    if (options && "body" in options && options.body !== undefined) {
      context.init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    for (const interceptor of this.requestInterceptors) {
      context = await interceptor(context);
    }

    let response: Response;
    try {
      response = await fetch(context.url, context.init);
    } catch (error) {
      const networkError = createNetworkError(error);
      reportHttpError(networkError, context);

      for (const interceptor of this.errorInterceptors) {
        await interceptor(networkError, context);
      }
      throw networkError;
    }

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const error = createApiError(response.status, payload, response.statusText || "Request failed");
      reportHttpError(error, context);

      for (const interceptor of this.errorInterceptors) {
        await interceptor(error, context);
      }
      throw error;
    }

    return unwrapPayload<T>(payload);
  }

  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }
}

export const apiClient = new ApiClient(API_ORIGIN);

export function configureApiAuthHandlers(handlers: AuthHandlers) {
  apiClient.configureAuthHandlers(handlers);
}
