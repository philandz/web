"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function PageToolbar() {
  const t = useTranslations("admin.toolbar");

  return (
    <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className={cn("text-2xl font-semibold tracking-tight text-slate-900 dark:text-white")}>{t("title")}</h1>
        <p className={cn("text-sm text-slate-500 dark:text-slate-300")}>{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full min-w-[220px] md:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder={t("search")} />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
