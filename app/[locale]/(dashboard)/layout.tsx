"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoadingState } from "@/components/state/page-loading-state";
import { routes } from "@/constants/routes";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthHydration } from "@/hooks/use-auth-hydration";
import { useAuthStore } from "@/lib/auth-store";
import { getDashboardRedirect } from "@/modules/auth/route-guards";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Route-group guard for normal users: keeps pages focused on UI rendering.
  const tAuth = useTranslations("auth.login");
  const tCommon = useTranslations("common.states");
  const tShell = useTranslations("dashboard.shell");
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthHydration();
  const token = useAuthStore((state) => state.token);
  const userType = useAuthStore((state) => state.userType);
  const selectedOrgId = useAuthStore((state) => state.selectedOrgId);
  const profile = useAuthStore((state) => state.profile);
  const authReady = hydrated || Boolean(token && userType);

  useEffect(() => {
    if (!authReady) return;

    const redirectTo = getDashboardRedirect({ token, userType, selectedOrgId }, pathname);
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [authReady, pathname, router, selectedOrgId, token, userType]);

  if (!authReady) {
    return (
      <main className="container py-8">
        <PageLoadingState
          message={tCommon("loading")}
          action={
            <button className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted" onClick={() => router.replace(routes.login)}>
              {tAuth("title")}
            </button>
          }
        />
      </main>
    );
  }

  if (!token || !userType) {
    return (
      <main className="container py-8">
        <PageLoadingState
          message={tCommon("loading")}
          action={
            <button className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted" onClick={() => router.replace(routes.login)}>
              {tAuth("title")}
            </button>
          }
        />
      </main>
    );
  }

  if (userType === "super_admin") {
    return (
      <main className="container py-8">
        <PageLoadingState
          message={tCommon("loading")}
          action={
            <button className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted" onClick={() => router.replace(routes.admin)}>
              {tShell("insights")}
            </button>
          }
        />
      </main>
    );
  }

  const pageTitle = (() => {
    if (pathname === routes.root) return tShell("dashboard");
    if (pathname.startsWith(routes.budgets)) return tShell("budgets");
    if (pathname.startsWith(routes.transactions)) return tShell("transactions");
    if (pathname.startsWith(routes.organization)) return tShell("organizationCenter");
    if (pathname.startsWith(routes.profile)) return tShell("profile");
    if (pathname.startsWith(routes.settings)) return tShell("settings");
    return undefined;
  })();

  const wide = pathname.startsWith(routes.budgets);

  return (
    <AppShell
      userType={userType}
      profileName={profile?.displayName ?? tShell("me")}
      profileAvatar={profile?.avatar ?? ""}
      pageTitle={pageTitle}
      wide={wide}
    >
      {children}
    </AppShell>
  );
}
