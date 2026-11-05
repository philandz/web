"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatIsoDate } from "@/lib/format";

interface PeriodSwitcherProps {
  offset: number;
  onChange: (offset: number) => void;
  /** YYYY-MM-DD inclusive / exclusive; empty while loading */
  from?: string;
  to?: string;
}

/** Previous/next budget period with the exact date range, so a custom start day is never a surprise. */
export function PeriodSwitcher({ offset, onChange, from, to }: PeriodSwitcherProps) {
  const t = useTranslations("budget.period");
  const locale = useLocale();
  // `to` is exclusive; show the last day
  const lastDay = to ? new Date(new Date(to).getTime() - 86_400_000).toISOString().slice(0, 10) : "";
  return (
    <div className="flex items-center gap-1" data-testid="period-switcher">
      <button
        type="button"
        onClick={() => onChange(offset - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("previous")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(0)}
        disabled={offset === 0}
        className="min-w-[170px] rounded-lg border border-border bg-muted px-3 py-1 text-center text-xs font-semibold text-foreground disabled:cursor-default"
        title={offset === 0 ? undefined : t("backToCurrent")}
      >
        {from && lastDay ? `${formatIsoDate(from, locale)} – ${formatIsoDate(lastDay, locale)}` : "…"}
        {offset === 0 ? <span className="ml-1.5 text-primary">· {t("current")}</span> : null}
      </button>
      <button
        type="button"
        onClick={() => onChange(offset + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("next")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
