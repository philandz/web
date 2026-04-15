"use client";

import { useTranslations } from "next-intl";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Settings2,
  UserCircle2,
  Users,
} from "lucide-react";

import { UserMenuContent } from "@/components/layout/user-menu-content";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import type { AppOrgRole, AppUserType } from "@/lib/identity-normalize";
import type { IdentityOrganization } from "@/types/identity";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  userType: AppUserType;
  profileName: string;
  profileAvatar?: string;
  organizations: IdentityOrganization[];
  selectedOrgId: string | null;
  orgRole: AppOrgRole;
  onSelectOrganization: (orgId: string) => void;
  onNavigateDashboard: () => void;
  onNavigateOrganizations: () => void;
  onNavigateAdminUsers?: () => void;
  onNavigateAdminOrgs?: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  soon,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {soon ? (
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      ) : null}
      {active ? (
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}

export function SidebarNav({
  userType,
  profileName,
  profileAvatar,
  organizations,
  selectedOrgId,
  orgRole,
  onSelectOrganization,
  onNavigateDashboard,
  onNavigateOrganizations,
  onNavigateAdminUsers,
  onNavigateAdminOrgs,
  onNavigateSettings,
  onSignOut,
}: SidebarNavProps) {
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isRoot = pathname === "/" || pathname === "";
  const isOrgs = pathname === "/organization" || pathname.startsWith("/organization/") || pathname.includes("select-organization");
  const isProfile = pathname.includes("profile");
  const isSettings = pathname.includes("settings");
  const isAdminUsers = pathname.includes("admin/users");
  const isAdminOrgs = pathname.includes("admin/organizations");

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? organizations[0] ?? null;

  return (
    <aside className="surface-panel flex h-full flex-col rounded-2xl p-3 shadow-soft">

      {/* Brand header */}
      <div className="mb-5 flex items-center gap-2.5 px-2 pt-1">
        <Image src="/philand.png" alt="Philand" width={28} height={28} priority />
        <span className="text-sm font-semibold tracking-tight text-foreground">{tCommon("app.name")}</span>
      </div>

      {/* Primary nav */}
      <nav className="space-y-0.5 px-1">
        <NavItem
          icon={LayoutDashboard}
          label={tShell("dashboard")}
          active={isRoot}
          onClick={onNavigateDashboard}
        />
        {userType === "super_admin" ? (
          <>
            <NavItem
              icon={Users}
              label={tShell("adminUsers")}
              active={isAdminUsers}
              onClick={() => onNavigateAdminUsers ? onNavigateAdminUsers() : router.push(routes.adminUsers)}
            />
            <NavItem
              icon={Building2}
              label={tShell("adminOrgs")}
              active={isAdminOrgs}
              onClick={() => onNavigateAdminOrgs ? onNavigateAdminOrgs() : router.push(routes.adminOrgs)}
            />
          </>
        ) : (
          <NavItem
            icon={BarChart3}
            label={tShell("organizationCenter")}
            active={isOrgs}
            onClick={onNavigateOrganizations}
          />
        )}
      </nav>

      {/* Secondary nav — only for normal users */}
      {userType !== "super_admin" ? (
        <div className="mt-4 border-t border-border/50 px-1 pt-4 space-y-0.5">
          <NavItem
            icon={UserCircle2}
            label={tShell("profile")}
            active={isProfile}
            onClick={() => router.push("/profile")}
          />
          <NavItem
            icon={Settings2}
            label={tShell("settings")}
            active={isSettings}
            onClick={onNavigateSettings}
          />
        </div>
      ) : null}

      {/* User menu — bottom */}
      <div ref={profileRef} className="relative mt-auto px-1 pt-4">
        <div className="border-t border-border/50 pt-4">
          <button
            onClick={() => setProfileOpen((p) => !p)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted"
          >
            <UserAvatar name={profileName} src={profileAvatar} size={32} fallbackClassName="text-[11px]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{profileName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {selectedOrg?.name ?? tShell("noOrganization")}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                profileOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Profile dropdown — opens upward */}
        {profileOpen ? (
          <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-float">
            <UserMenuContent
              userType={userType}
              organizations={organizations}
              selectedOrgId={selectedOrgId}
              onSelectOrganization={(id) => { onSelectOrganization(id); setProfileOpen(false); }}
              onSignOut={onSignOut}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
