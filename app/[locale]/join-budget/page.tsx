"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Check, ArrowRight } from "lucide-react";

import { usePreviewJoinLinkMutation, useJoinAsGuestMutation } from "@/modules/sharing/hooks";
import type { JoinLinkPreview } from "@/services/sharing-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageState =
  | "loading"
  | "missing-token"
  | "invalid"
  | "form";

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Loading spinner
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground">Verifying invite…</p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Invalid / expired link
// ---------------------------------------------------------------------------

function InvalidState() {
  const router = useRouter();

  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            This invite link isn&apos;t valid
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask the person who shared it for a new link.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted/70"
        >
          Go to Philandz
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Valid form
// ---------------------------------------------------------------------------

function ValidFormState({
  preview,
  token,
  locale,
}: {
  preview: JoinLinkPreview;
  token: string;
  locale: string;
}) {
  const router = useRouter();
  const joinMutation = useJoinAsGuestMutation();

  const [displayName, setDisplayName] = useState("");
  const [touched, setTouched] = useState(false);

  const nameLen = displayName.trim().length;
  const nameError =
    touched && (nameLen < 2 || nameLen > 60)
      ? "Display name must be 2–60 characters"
      : null;

  const isValid = nameLen >= 2 && nameLen <= 60;
  const isJoining = joinMutation.status === "pending";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    joinMutation.mutate(
      { token, displayName: displayName.trim() },
      {
        onSuccess: (result) => {
          // Redirect after brief success display
          setTimeout(() => {
            router.push(`/${locale}/(dashboard)/sharing/${result.budgetId}`);
          }, 800);
        },
      }
    );
  }

  // Success state — shown after join mutation succeeds
  if (joinMutation.isSuccess) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600">
            <Check className="h-8 w-8 animate-in fade-in zoom-in duration-300" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Welcome, {displayName.trim()}!
            </h2>
            <p className="text-sm text-muted-foreground">
              You&apos;re in. Redirecting to the trip…
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Budget info pill */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {preview.currency} · {preview.memberCount}{" "}
            {preview.memberCount === 1 ? "member" : "members"}
          </span>
        </div>

        {/* Display name input */}
        <div className="space-y-1.5">
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-foreground"
          >
            Your display name
          </label>
          <div className="relative">
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={isJoining}
              placeholder="e.g. Alex"
              maxLength={60}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {nameLen} / 60
            </span>
          </div>
          {nameError && (
            <p className="text-xs text-red-500">{nameError}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isJoining}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          {isJoining ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Join this trip
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function JoinBudgetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? "en";
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [preview, setPreview] = useState<JoinLinkPreview | null>(null);

  const previewMutation = usePreviewJoinLinkMutation();

  useEffect(() => {
    if (!token) {
      setState("missing-token");
      return;
    }

    setState("loading"); // reset to loading while validating

    previewMutation.mutate(token, {
      onSuccess: (data) => {
        setPreview(data);
        setState(data.valid ? "form" : "invalid");
      },
      onError: () => {
        setState("invalid");
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === "loading" || !token) {
    return <LoadingState />;
  }

  if (state === "invalid") {
    return <InvalidState />;
  }

  if (state === "form" && preview) {
    return <ValidFormState preview={preview} token={token} locale={locale} />;
  }

  return null;
}
