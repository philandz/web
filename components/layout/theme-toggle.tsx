"use client";

import { Laptop, MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { ThemeMode } from "@/constants/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("common.theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: ThemeMode = mounted && (theme === "dark" || theme === "light" || theme === "system") ? theme : "system";

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1", className)}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
          currentTheme === "light" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          compact ? "h-7 px-2" : "h-8 px-2.5"
        )}
        aria-label={t("light")}
      >
        <Sun className="h-3.5 w-3.5" />
        {!compact ? t("light") : null}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
          currentTheme === "dark" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          compact ? "h-7 px-2" : "h-8 px-2.5"
        )}
        aria-label={t("dark")}
      >
        <MoonStar className="h-3.5 w-3.5" />
        {!compact ? t("dark") : null}
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
          currentTheme === "system" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          compact ? "h-7 px-2" : "h-8 px-2.5"
        )}
        aria-label={t("system")}
      >
        <Laptop className="h-3.5 w-3.5" />
        {!compact ? t("system") : null}
      </button>
    </div>
  );
}
