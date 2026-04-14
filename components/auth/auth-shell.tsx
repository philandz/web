"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  const tShell = useTranslations("auth.shell");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:p-5">

        {/* Form side */}
        <section className="flex min-h-screen flex-col px-6 py-8 md:items-center md:justify-center md:px-8 lg:min-h-0 lg:py-8">

          {/* Card — desktop wraps content; mobile is full-bleed */}
          <div className="flex w-full flex-1 flex-col md:max-w-md md:flex-none md:rounded-2xl md:border md:border-border md:bg-card md:p-7 md:shadow-float">

            {/* Logo — large on mobile, compact inside card on desktop */}
            <div className="mb-8 flex items-center gap-3 md:mb-6">
              <Image src="/philand.png" alt={tCommon("app.name")} width={40} height={40} priority className="md:hidden" />
              <Image src="/philand.png" alt={tCommon("app.name")} width={28} height={28} priority className="hidden md:block" />
              <span className="text-xl font-semibold tracking-tight md:text-sm">{tCommon("app.name")}</span>
            </div>

            {/* Page title */}
            <div className="mb-7 space-y-1">
              <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* Form content */}
            <div className="flex-1">{children}</div>

            {/* Language + theme — bottom on mobile, bottom of card on desktop */}
            <div className="mt-8 flex items-center justify-center gap-3 border-t border-border/50 pt-5">
              <LanguageSwitcher />
              <div className="h-4 w-px bg-border/60" />
              <AuthThemeToggle />
            </div>
          </div>
        </section>

        {/* Hero side — desktop only */}
        <section className="surface-muted relative hidden overflow-hidden rounded-2xl p-8 lg:block">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <Image src="/philand.png" alt={tCommon("app.name")} width={36} height={36} priority className="opacity-90" />
              <div>
                <p className="text-sm font-semibold text-foreground">{tShell("workspaceTitle")}</p>
                <p className="text-xs text-muted-foreground">{tShell("workspaceSubtitle")}</p>
              </div>
            </div>

            <div className="space-y-4 pb-2">
              <h2 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
                {tShell("heroTitle")}
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {tShell("heroDescription")}
              </p>
            </div>

            <div className="surface-panel rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{tShell("monthlyBalance")}</span>
                <span className="rounded-full bg-highlight/20 px-2 py-0.5 text-[11px] font-semibold text-foreground">+12.4%</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">$84,921.00</p>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div className="h-1.5 w-3/5 rounded-full bg-highlight" />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-12 -right-8 h-52 w-52 rounded-full bg-card/40 blur-2xl" />
          <div className="pointer-events-none absolute -top-14 right-10 h-40 w-40 rounded-full bg-highlight/30 blur-2xl" />
        </section>
      </div>
    </main>
  );
}
