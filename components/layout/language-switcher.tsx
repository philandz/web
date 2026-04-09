"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("common.language");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className={cn("inline-flex items-center gap-2 text-xs font-medium text-muted-foreground", className)}>
      {!compact ? <span>{t("label")}</span> : null}
      <select
        value={locale}
        onChange={(event) => {
          router.replace(pathname, { locale: event.target.value as AppLocale });
        }}
        className={cn("rounded-lg border border-border bg-card text-xs text-foreground", compact ? "h-7 px-2" : "h-8 px-2")}
      >
        <option value="en">{t("english")}</option>
        <option value="vi">{t("vietnamese")}</option>
      </select>
    </label>
  );
}
