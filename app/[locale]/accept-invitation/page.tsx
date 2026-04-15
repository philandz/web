"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { InlineAlert } from "@/components/state/inline-alert";
import { routes } from "@/constants/routes";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { identityService } from "@/services/identity-service";

type PageState = "loading" | "success" | "success-authenticated" | "no-account" | "error" | "missing-token";

export default function AcceptInvitationPage() {
  const t = useTranslations("auth.acceptInvitation");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const isAuthenticated = useAuthStore((state) => Boolean(state.token));
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  const [state, setState] = useState<PageState>(token ? "loading" : "missing-token");

  useEffect(() => {
    if (!token) return;

    identityService
      .acceptInvitation(token)
      .then(async () => {
        if (isAuthenticated) {
          // Refresh the org list so the new org appears in the auth store,
          // then redirect straight to the workspace picker.
          try {
            const fresh = await identityService.organizations();
            setOrganizations(fresh);
          } catch {
            // Non-fatal — store refresh failed but join succeeded.
            // The user will see the new org after their next login.
          }
          setState("success-authenticated");
        } else {
          setState("success");
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("FAILED_PRECONDITION") || msg.includes("failed_precondition")) {
          setState("no-account");
        } else {
          setState("error");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Redirect authenticated users after a brief moment so they can read the message.
  useEffect(() => {
    if (state !== "success-authenticated") return;
    const id = setTimeout(() => router.replace(routes.selectOrganization), 1500);
    return () => clearTimeout(id);
  }, [state, router]);

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-4">
        {state === "loading" ? (
          <InlineAlert tone="info">{t("loading")}</InlineAlert>
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
        ) : state === "no-account" ? (
          <>
            <InlineAlert tone="error">{t("noAccount")}</InlineAlert>
            <Link
              href={token ? `${routes.signup}?invitation=${token}` : routes.signup}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
            >
              {t("createAccount")}
            </Link>
          </>
        ) : state === "error" ? (
          <>
            <InlineAlert tone="error">{t("error")}</InlineAlert>
            <p className="text-center text-sm text-muted-foreground">{t("requestNew")}</p>
            <Link
              href={routes.login}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
            >
              {t("goHome")}
            </Link>
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
