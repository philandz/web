"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { LoginHeroPanel } from "@/components/auth/login-hero-panel";
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
        <LoginHeroPanel />
      </div>
    </main>
  );
}
