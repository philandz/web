"use client";

import Image from "next/image";

/**
 * Full-screen loading state — used for route-level Suspense boundaries
 * and auth-resolving layouts. Feels like a real app boot, not a debug panel.
 *
 * `action` is optional — shown below the spinner for redirect/error recovery.
 */
export function PageLoadingState({
  message,
  action,
}: {
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label={message ?? "Loading"}
    >
      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Image
            src="/philand.png"
            alt="Philand"
            width={48}
            height={48}
            priority
            className="animate-pulse"
          />
        </div>

        <span className="text-base font-semibold tracking-tight text-foreground">
          Philand
        </span>
      </div>

      {/* Slim animated progress bar */}
      <div className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full origin-left animate-loading-bar rounded-full bg-primary" />
      </div>

      {/* Optional message */}
      {message ? (
        <p className="mt-4 text-xs text-muted-foreground">{message}</p>
      ) : null}

      {/* Recovery action (e.g. "Go to login") */}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
