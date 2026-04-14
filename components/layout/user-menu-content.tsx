"use client";

import { Building2, Check, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AppUserType } from "@/lib/identity-normalize";
import type { IdentityOrganization } from "@/types/identity";
import { cn } from "@/lib/utils";

const APP_VERSION = "0.1.0";

interface UserMenuContentProps {
  userType?: AppUserType;
  organizations?: IdentityOrganization[];
  selectedOrgId?: string | null;
  onSelectOrganization?: (orgId: string) => void;
  onSignOut: () => void;
}

export function UserMenuContent({
  userType,
  organizations = [],
  selectedOrgId,
  onSelectOrganization,
  onSignOut,
}: UserMenuContentProps) {
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common");

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? organizations[0] ?? null;
  const showOrgSwitcher = userType === "normal" && organizations.length > 0;

  return (
    <>
      {/* Org switcher */}
      {showOrgSwitcher ? (
        <>
          <div className="mb-1 px-1 pt-0.5">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {tShell("workspace")}
            </p>
            <div className="space-y-0.5">
              {organizations.map((org) => {
                const active = org.id === selectedOrg?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => onSelectOrganization?.(org.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                      {org.name[0]}
                    </span>
                    <span className="flex-1 truncate font-medium">{org.name}</span>
                    {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="my-1 h-px bg-border/60" />
        </>
      ) : userType === "super_admin" ? (
        <>
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{tShell("superAdminWorkspace")}</span>
          </div>
          <div className="my-1 h-px bg-border/60" />
        </>
      ) : null}

      {/* Preferences */}
      <div className="rounded-lg bg-muted/50 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {tShell("language")}
          </span>
          <LanguageSwitcher compact />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {tShell("theme")}
          </span>
          <ThemeToggle compact />
        </div>
      </div>

      <div className="my-1 h-px bg-border/60" />

      <button
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4" />
        {tCommon("actions.signOut")}
      </button>

      {/* Version */}
      <p className="mt-1 px-3 pb-0.5 text-[10px] text-muted-foreground/60">
        {tCommon("app.name")} v{APP_VERSION}
      </p>
    </>
  );
}
