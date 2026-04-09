"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { BarChart3, ChevronUp, KeyRound, LayoutDashboard, LogOut, Settings2, UserCircle2 } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AppOrgRole, AppUserType } from "@/lib/identity-normalize";
import type { IdentityOrganization } from "@/types/identity";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  userType: AppUserType;
  profileName: string;
  organizations: IdentityOrganization[];
  selectedOrgId: string | null;
  currentOrgName: string;
  orgRole: AppOrgRole;
  canManageOrganization: boolean;
  onSelectOrganization: (orgId: string) => void;
  onNavigateDashboard: () => void;
  onNavigateOrganizations: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
}

export function SidebarNav({
  userType,
  profileName,
  organizations,
  selectedOrgId,
  currentOrgName,
  orgRole,
  canManageOrganization,
  onSelectOrganization,
  onNavigateDashboard,
  onNavigateOrganizations,
  onNavigateSettings,
  onSignOut
}: SidebarNavProps) {
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside className="surface-panel flex rounded-2xl p-4 shadow-soft md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:flex-col">
      <div className="mb-5 rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{tShell("workspace")}</p>
          {userType === "super_admin" ? (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.08em]">
              {tShell("superAdminScope")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="capitalize">
              {orgRole}
            </Badge>
          )}
        </div>

        {userType === "normal" ? (
          <OrganizationSwitcher organizations={organizations} selectedOrgId={selectedOrgId} onSelect={onSelectOrganization} />
        ) : (
          <p className="truncate text-sm font-semibold text-foreground">{tShell("superAdminWorkspace")}</p>
        )}

        {userType === "normal" && selectedOrgId ? (
          <p className="mt-2 truncate text-xs text-muted-foreground">{currentOrgName}</p>
        ) : null}
      </div>

      <nav className="space-y-1.5">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            "active-lime hover:bg-highlight/20"
          )}
          onClick={onNavigateDashboard}
        >
          <LayoutDashboard className="h-4 w-4 text-highlight" /> {tShell("dashboard")}
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onNavigateOrganizations}
        >
          <BarChart3 className="h-4 w-4" /> {userType === "super_admin" ? tShell("financialInsights") : tShell("organizationCenter")}
        </button>
      </nav>

      <div className="relative mt-6 border-t border-border/70 pt-4 md:mt-auto">
        {profileOpen ? (
          <div className="mb-2 rounded-xl border border-border/80 bg-card p-2 shadow-float">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                setProfileOpen(false);
                router.push("/profile");
              }}
            >
              <UserCircle2 className="h-4 w-4" /> {tShell("profile")}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-muted"
              onClick={() => {
                setProfileOpen(false);
                router.push("/forgot-password");
              }}
            >
              <KeyRound className="h-4 w-4" /> {tShell("resetPassword")}
            </button>
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
              onClick={() => {
                setProfileOpen(false);
                onNavigateSettings();
              }}
            >
              <Settings2 className="h-4 w-4" /> {tShell("settings")}
            </button>

            {userType === "normal" ? (
              <button
                className={cn(
                  "mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  canManageOrganization ? "text-muted-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground/70"
                )}
                onClick={() => {
                  if (!canManageOrganization) return;
                  setProfileOpen(false);
                  onNavigateOrganizations();
                }}
                disabled={!canManageOrganization}
              >
                <BarChart3 className="h-4 w-4" /> {tShell("manageOrganization")}
              </button>
            ) : null}

            <div className="mt-2 rounded-lg border border-border/70 bg-muted/45 p-2">
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

            <button
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-500/10"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" /> {tCommon("actions.signOut")}
            </button>
          </div>
        ) : null}

        <Button variant="outline" className="w-full justify-between" onClick={() => setProfileOpen((prev) => !prev)}>
          <span className="flex items-center gap-2 overflow-hidden">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-highlight/25 text-[11px] font-semibold text-highlight">
              {(profileName || "U")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </span>
            <span className="truncate text-sm">{profileName}</span>
          </span>
          <ChevronUp className={`h-4 w-4 transition ${profileOpen ? "rotate-180" : ""}`} />
        </Button>
      </div>
    </aside>
  );
}
