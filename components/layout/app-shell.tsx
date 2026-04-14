"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Building2, LayoutDashboard, UserCircle2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenuContent } from "@/components/layout/user-menu-content";
import { UserAvatar } from "@/components/ui/user-avatar";
import { routes } from "@/constants/routes";
import { useAuthStore } from "@/lib/auth-store";
import type { AppUserType } from "@/lib/identity-normalize";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/navigation";

interface AppShellProps {
  userType: AppUserType;
  profileName: string;
  profileAvatar?: string;
  children: React.ReactNode;
}

export function AppShell({ userType, profileName, profileAvatar, children }: AppShellProps) {
  const tShell = useTranslations("dashboard.shell");
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const selectOrganization = useAuthStore((state) => state.selectOrganization);
  const tenant = useTenantContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  const dashboardPath = userType === "super_admin" ? routes.admin : routes.root;
  const secondaryPath = userType === "super_admin" ? "/admin?view=users" : routes.selectOrganization;
  const settingsPath = userType === "super_admin" ? routes.admin : routes.settings;

  const isRoot = pathname === "/" || pathname === "";
  const isOrgs = pathname.includes("select-organization");

  const mobileNavItems = [
    {
      label: tShell("home"),
      icon: LayoutDashboard,
      active: isRoot,
      onClick: () => { setMobileMenuOpen(false); router.push(dashboardPath); },
    },
    {
      label: userType === "super_admin" ? tShell("insights") : tShell("orgs"),
      icon: userType === "super_admin" ? BarChart3 : Building2,
      active: isOrgs,
      onClick: () => { setMobileMenuOpen(false); router.push(secondaryPath); },
    },
    {
      label: tShell("me"),
      icon: UserCircle2,
      active: mobileMenuOpen || pathname.includes("profile"),
      onClick: () => setMobileMenuOpen((p) => !p),
      isProfile: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen p-3">
          <SidebarNav
            userType={userType}
            profileName={profileName}
            profileAvatar={profileAvatar}
            organizations={tenant.organizations}
            selectedOrgId={tenant.selectedOrgId}
            orgRole={tenant.orgRole}
            onSelectOrganization={(orgId) => {
              selectOrganization(orgId);
              router.push(routes.root);
            }}
            onNavigateDashboard={() => router.push(dashboardPath)}
            onNavigateOrganizations={() => router.push(secondaryPath)}
            onNavigateSettings={() => router.push(settingsPath)}
            onSignOut={() => { clearAuth(); router.push(routes.login); }}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="container max-w-4xl py-6 pb-24 pt-20 md:pb-8 md:pt-6">
          {children}
        </div>
      </main>

      {/* Mobile: top bar */}
      <header className="surface-panel fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-border/60 px-4 py-3 md:hidden">
        <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
          <UserAvatar name={profileName} src={profileAvatar} size={30} fallbackClassName="text-[10px]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
            {tenant.selectedOrganization ? (
              <p className="truncate text-[11px] text-muted-foreground">{tenant.selectedOrganization.name}</p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile: profile sheet */}
      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            ref={mobileMenuRef}
            className="fixed inset-x-4 bottom-20 z-50 rounded-2xl border border-border/80 bg-card p-2 shadow-float md:hidden"
          >
            <UserMenuContent
              userType={userType}
              organizations={tenant.organizations}
              selectedOrgId={tenant.selectedOrgId}
              onSelectOrganization={(id) => { selectOrganization(id); setMobileMenuOpen(false); router.push(routes.root); }}
              onSignOut={() => { clearAuth(); router.push(routes.login); }}
            />
          </div>
        </>
      ) : null}

      {/* Mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-3">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  item.active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.isProfile ? (
                  <UserAvatar
                    name={profileName}
                    src={profileAvatar}
                    size={22}
                    className={cn(
                      "transition-all",
                      item.active ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                    )}
                    fallbackClassName="text-[9px]"
                  />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
