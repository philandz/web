"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { InlineAlert } from "@/components/state/inline-alert";
import { routes } from "@/constants/routes";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { isApiError } from "@/lib/http/errors";
import { identityService } from "@/services/identity-service";

type PageState = "ready" | "joining" | "success" | "success-authenticated" | "failed" | "missing-token";

export default function AcceptInvitationPage() {
  const t = useTranslations("auth.acceptInvitation");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const isAuthenticated = useAuthStore((state) => Boolean(state.token));
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  // Nothing happens until the person confirms: link scanners in mail clients open links
  // too, and must not be able to accept on their behalf.
  const [state, setState] = useState<PageState>(token ? "ready" : "missing-token");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegisterCta, setShowRegisterCta] = useState(false);

  function accept() {
    if (!token || state === "joining") return;
    setState("joining");
    identityService
      .acceptInvitation(token)
      .then(async () => {
        // Read the store now, not at first render: the session may hydrate after mount.
        if (useAuthStore.getState().token) {
          try {
            setOrganizations(await identityService.organizations());
          } catch {
            // Non-fatal: the new organization shows up after the next sign-in.
          }
          setState("success-authenticated");
        } else {
          setState("success");
        }
      })
      .catch((err: unknown) => {
        const code = isApiError(err) ? err.code.toLowerCase() : "";
        const isNoAccount = code === "failed_precondition";
        setErrorMessage(isNoAccount ? t("errorNoAccount") : t("error"));
        setShowRegisterCta(isNoAccount);
        setState("failed");
      });
  }

  // Redirect signed-in users after a brief moment so they can read the message.
  useEffect(() => {
    if (state !== "success-authenticated") return;
    const id = setTimeout(() => router.replace(routes.selectOrganization), 1500);
    return () => clearTimeout(id);
  }, [state, router]);

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-4">
        {state === "ready" || state === "joining" ? (
          <>
            <p className="text-sm text-muted-foreground">{t("confirmHint")}</p>
            <button
              type="button"
              onClick={accept}
              disabled={state === "joining"}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              data-testid="accept-invitation"
            >
              {state === "joining" ? t("loading") : t("confirm")}
            </button>
            {!isAuthenticated ? (
              <p className="text-center text-xs text-muted-foreground">{t("signInLater")}</p>
            ) : null}
          </>
        ) : state === "success-authenticated" ? (
          <InlineAlert tone="success">{t("successAuthenticated")}</InlineAlert>
        ) : state === "success" ? (
          <>
            <InlineAlert tone="success">{t("success")}</InlineAlert>
            <Link
              href={routes.login}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
            >
              {t("signIn")}
            </Link>
          </>
        ) : state === "failed" ? (
          <>
            <InlineAlert tone="error">{errorMessage}</InlineAlert>
            {showRegisterCta ? (
              <Link
                href={token ? `${routes.signup}?invitation=${token}` : routes.signup}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
              >
                {t("createAccount")}
              </Link>
            ) : (
              <Link
                href={routes.login}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
              >
                {t("goHome")}
              </Link>
            )}
          </>
        ) : (
          <>
            <InlineAlert tone="error">{t("missingToken")}</InlineAlert>
            <Link
              href={routes.login}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
            >
              {t("goHome")}
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
