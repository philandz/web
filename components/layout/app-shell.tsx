"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Building2, KeyRound, LayoutDashboard, LogOut, Settings2, UserCircle2 } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { routes } from "@/constants/routes";
import { useAuthStore } from "@/lib/auth-store";
import type { AppUserType } from "@/lib/identity-normalize";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/navigation";

interface AppShellProps {
  userType: AppUserType;
  profileName: string;
  children: React.ReactNode;
}

export function AppShell({ userType, profileName, children }: AppShellProps) {
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const selectOrganization = useAuthStore((state) => state.selectOrganization);
  const tenant = useTenantContext();

  const dashboardPath = userType === "super_admin" ? "/admin" : "/";
  const secondaryPath = userType === "super_admin" ? "/admin?view=users" : "/select-organization";
  const settingsPath = userType === "super_admin" ? "/admin" : "/settings";
  const matchesPath = (target: string) => pathname === target || pathname.endsWith(target);

  const mobileNav = [
    {
      label: tShell("home"),
      icon: LayoutDashboard,
      path: dashboardPath,
      active: userType === "super_admin" ? matchesPath("/admin") : pathname === "/" || pathname === ""
    },
    {
      label: userType === "super_admin" ? tShell("insights") : tShell("orgs"),
      icon: userType === "super_admin" ? BarChart3 : Building2,
      path: secondaryPath,
      active: userType === "super_admin" ? matchesPath("/admin") : matchesPath("/select-organization")
    },
    {
      label: tShell("me"),
      icon: LayoutDashboard,
      path: "#",
      active: mobileProfileOpen
    }
  ];

  return (
    <main className="container py-4 pb-24 md:py-4 md:pb-6">
      <div className="surface-panel mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-highlight/25 text-[11px] font-semibold text-highlight">
            {(profileName || "U")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profileName}</p>
            {tenant.selectedOrganization ? <p className="truncate text-xs text-muted-foreground">{tenant.selectedOrganization.name}</p> : null}
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-highlight/20 text-highlight"
          onClick={() => setMobileProfileOpen((prev) => !prev)}
          aria-label={tShell("me")}
        >
          <UserCircle2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr] md:gap-5">
        <div className="hidden md:block">
          <SidebarNav
            userType={userType}
            profileName={profileName}
            organizations={tenant.organizations}
            selectedOrgId={tenant.selectedOrgId}
            currentOrgName={tenant.selectedOrganization?.name ?? tShell("noOrganization")}
            orgRole={tenant.orgRole}
            canManageOrganization={tenant.permissions.canManageOrganization}
            onSelectOrganization={(orgId) => {
              selectOrganization(orgId);
              router.push(routes.root);
            }}
            onNavigateDashboard={() => router.push(dashboardPath)}
            onNavigateOrganizations={() => router.push(secondaryPath)}
            onNavigateSettings={() => router.push(settingsPath)}
            onSignOut={() => {
              clearAuth();
              router.push("/login");
            }}
          />
        </div>

        <section className="space-y-5">{children}</section>
      </div>

      {mobileProfileOpen ? (
        <div className="fixed inset-x-4 bottom-20 z-40 rounded-2xl border border-border/80 bg-card p-2 shadow-float md:hidden">
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
            onClick={() => {
              setMobileProfileOpen(false);
              router.push("/profile");
            }}
          >
            <UserCircle2 className="h-4 w-4" /> {tShell("profile")}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
            onClick={() => {
              setMobileProfileOpen(false);
              router.push("/forgot-password");
            }}
          >
            <KeyRound className="h-4 w-4" /> {tShell("resetPassword")}
          </button>
          <button
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
            onClick={() => {
              setMobileProfileOpen(false);
              router.push(settingsPath);
            }}
          >
            <Settings2 className="h-4 w-4" /> {tShell("settings")}
          </button>

          <div className="mt-2 rounded-xl border border-border/70 bg-muted/45 p-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tShell("preferences")}</p>
            <div className="mb-1 flex items-center justify-between gap-2 rounded-md px-1 py-1">
              <span className="text-xs text-muted-foreground">{tShell("language")}</span>
              <LanguageSwitcher compact />
            </div>
            <div className="rounded-md px-1 py-1">
              <span className="mb-1 block text-xs text-muted-foreground">{tShell("theme")}</span>
              <ThemeToggle compact className="w-full justify-between" />
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-2 w-full justify-center"
            onClick={() => {
              clearAuth();
              router.push("/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> {tCommon("actions.signOut")}
          </Button>
        </div>
      ) : null}

      <nav className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-float backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-1.5">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === tShell("me")) {
                    setMobileProfileOpen((prev) => !prev);
                    return;
                  }

                  setMobileProfileOpen(false);
                  router.push(item.path);
                }}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center rounded-xl text-[11px] font-medium transition",
                  item.active
                    ? "bg-highlight/20 text-foreground"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {item.label === tShell("me") ? (
                  <>
                    <span className={cn("mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold", item.active ? "bg-highlight/25 text-highlight" : "bg-muted text-muted-foreground")}>
                      {(profileName || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <span className="max-w-[60px] truncate">{profileName?.split(" ")[0] ?? tShell("me")}</span>
                  </>
                ) : (
                  <>
                    <Icon className={cn("mb-0.5 h-4 w-4", item.active ? "text-highlight" : "text-muted-foreground")} />
                    {item.label}
                  </>
                )}
                <span
                  className={cn(
                    "absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full transition",
                    item.active ? "bg-highlight opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
