"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
import { BarChart3, BellRing, ChevronUp, ChevronsLeft, CreditCard, KeyRound, LayoutDashboard, LogOut, ReceiptText, Settings2, UserCircle2, Users2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export function PreviewSidebar({
  profileName,
  profileAvatar,
  onSignOut,
  collapsed,
  onToggleCollapse
}: {
  profileName: string;
  profileAvatar?: string;
  onSignOut: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const tShell = useTranslations("dashboard.shell");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = [
    { label: tShell("dashboard"), icon: LayoutDashboard, active: true },
    { label: tShell("transactions"), icon: ReceiptText },
    { label: tShell("accounts"), icon: CreditCard },
    { label: tShell("analytics"), icon: BarChart3 },
    { label: tShell("team"), icon: Users2 },
    { label: tShell("alerts"), icon: BellRing },
    { label: tShell("settingsSoon"), icon: Settings2 }
  ];

  return (
    <aside
      className={cn(
        "surface-panel relative z-30 flex overflow-visible rounded-2xl p-4 md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:flex-col"
      )}
    >
      <div className={cn("mb-6 flex items-center gap-2 px-2", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={tShell("openSidebar")}
            className="rounded-lg p-1 transition hover:bg-muted"
            aria-label={tShell("openSidebar")}
          >
            <Image src="/philand.png" alt={tCommon("app.name")} width={30} height={30} priority />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <Image src="/philand.png" alt={tCommon("app.name")} width={30} height={30} priority />
              <p className={cn("text-sm font-semibold text-slate-900 dark:text-white")}>{tCommon("app.name")}</p>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title={tShell("closeSidebar")}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={tShell("closeSidebar")}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                collapsed ? "justify-center px-0" : "",
                item.active
                  ? "bg-lime-300 text-slate-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!collapsed ? item.label : null}
            </button>
          );
        })}
      </nav>

      <div className="relative mt-5 border-t border-slate-200 pt-4 dark:border-slate-700 md:mt-auto">
        {open ? (
          <div
              className={cn(
               "surface-panel mb-2 rounded-xl p-2 shadow-float",
               collapsed ? "absolute bottom-12 left-full z-[80] ml-2 w-56" : ""
             )}
           >
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
            >
              <UserCircle2 className="h-4 w-4" /> {tShell("profile")}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                setOpen(false);
                router.push("/forgot-password");
              }}
            >
              <KeyRound className="h-4 w-4" /> {tShell("resetPassword")}
            </button>
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Settings2 className="h-4 w-4" /> {tShell("settingsSoon")}
            </button>
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-500/10"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" /> {tCommon("actions.signOut")}
            </button>
          </div>
        ) : null}

        <button
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700",
            collapsed ? "justify-center px-0" : ""
          )}
          onClick={() => setOpen((v) => !v)}
          title={collapsed ? tShell("profileActions") : undefined}
        >
          <span className="flex items-center gap-2 overflow-hidden">
            <UserAvatar
              name={profileName}
              src={profileAvatar}
              size={28}
              className="bg-lime-300/25 text-lime-500"
              fallbackClassName="text-[11px]"
            />
            {!collapsed ? <span className="truncate text-sm font-medium text-foreground">{profileName}</span> : null}
          </span>
          {!collapsed ? <ChevronUp className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} /> : null}
        </button>
      </div>
    </aside>
  );
}
