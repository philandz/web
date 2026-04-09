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
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-3 md:p-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
        <section className="flex items-start justify-center pt-4 md:items-center md:pt-0">
          <div className="surface-panel w-full max-w-md rounded-2xl p-5 shadow-float md:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/philand.png" alt={tCommon("app.name")} width={28} height={28} priority />
                <span className="text-sm font-semibold tracking-tight">{tCommon("app.name")}</span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <AuthThemeToggle />
              </div>
            </div>

            <div className="surface-muted mb-5 rounded-xl px-3 py-2.5 md:hidden">
              <p className="text-subtle text-[11px] uppercase tracking-[0.12em]">{tShell("secureAccess")}</p>
              <p className="mt-0.5 text-sm text-foreground">{tShell("secureAccessDescription")}</p>
            </div>

            <div className="mb-6 space-y-1">
              <h2 className="text-[28px] font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {children}
          </div>
        </section>

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
              <h1 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
                {tShell("heroTitle")}
              </h1>
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
