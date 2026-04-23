"use client";

import { Menu } from "lucide-react";
import { useRef, useEffect, useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenuContent } from "@/components/layout/user-menu-content";
import { UserAvatar } from "@/components/ui/user-avatar";
import { routes } from "@/constants/routes";
import { useAuthStore } from "@/lib/auth-store";
import type { AppUserType } from "@/lib/identity-normalize";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";

interface AppShellProps {
  userType: AppUserType;
  profileName: string;
  profileAvatar?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function AppShell({ userType, profileName, profileAvatar, children, wide }: AppShellProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const selectOrganization = useAuthStore((state) => state.selectOrganization);
  const tenant = useTenantContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
  const secondaryPath = userType === "super_admin" ? "/admin?view=users" : routes.organization;
  const settingsPath = userType === "super_admin" ? routes.admin : routes.settings;

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
        <div className={cn("container py-6 pb-8 pt-20 md:pt-6", wide ? "max-w-6xl" : "max-w-4xl")}>
          {children}
        </div>
      </main>

      {/* Mobile: top bar */}
      <header className="surface-panel fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-border/60 px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
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

      {/* Mobile: sidebar drawer (all user types) */}
      {mobileSidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 p-3 md:hidden">
            <SidebarNav
              userType={userType}
              profileName={profileName}
              profileAvatar={profileAvatar}
              organizations={tenant.organizations}
              selectedOrgId={tenant.selectedOrgId}
              orgRole={tenant.orgRole}
              onSelectOrganization={(orgId) => {
                selectOrganization(orgId);
                setMobileSidebarOpen(false);
                router.push(routes.root);
              }}
              onNavigateDashboard={() => { setMobileSidebarOpen(false); router.push(dashboardPath); }}
              onNavigateOrganizations={() => { setMobileSidebarOpen(false); router.push(secondaryPath); }}
              onNavigateAdminUsers={() => { setMobileSidebarOpen(false); router.push(routes.adminUsers); }}
              onNavigateAdminOrgs={() => { setMobileSidebarOpen(false); router.push(routes.adminOrgs); }}
              onNavigateBudgets={() => { setMobileSidebarOpen(false); router.push(routes.budgets); }}
              onNavigateTransactions={() => { setMobileSidebarOpen(false); router.push(routes.transactions); }}
              onNavigateSettings={() => { setMobileSidebarOpen(false); router.push(settingsPath); }}
              onSignOut={() => { setMobileSidebarOpen(false); clearAuth(); router.push(routes.login); }}
            />
          </div>
        </>
      ) : null}

      {/* Mobile: profile sheet */}
      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            ref={mobileMenuRef}
            className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-border/80 bg-card p-2 shadow-float md:hidden"
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
    </div>
  );
}
