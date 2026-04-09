"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

import { ToastProvider } from "@/components/state/toast-provider";
import { THEME_STORAGE_KEY } from "@/constants/theme";
import { configureApiAuthHandlers } from "@/lib/http/client";
import { reportObservabilityEvent, setObservabilityReporter, toErrorContext } from "@/lib/observability/client";
import { consoleObservabilityReporter } from "@/lib/observability/reporters/console";
import { useAuthStore } from "@/lib/auth-store";
import { isTokenExpired } from "@/modules/auth/session";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const expireSession = useAuthStore((state) => state.expireSession);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setObservabilityReporter(consoleObservabilityReporter);
    }

    configureApiAuthHandlers({
      getToken: () => useAuthStore.getState().token,
      onUnauthorized: () => {
        expireSession();
      }
    });
  }, [expireSession]);

  useEffect(() => {
    const check = () => {
      const token = useAuthStore.getState().token;
      if (!token) return;
      if (isTokenExpired(token)) {
        expireSession();
      }
    };

    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [expireSession]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportObservabilityEvent({
        type: "global_error",
        severity: "error",
        message: event.message || "Unhandled global error",
        context: {
          href: window.location.href,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          error: toErrorContext(event.error)
        }
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportObservabilityEvent({
        type: "unhandled_rejection",
        severity: "error",
        message: "Unhandled promise rejection",
        context: {
          href: window.location.href,
          reason: toErrorContext(event.reason)
        }
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
