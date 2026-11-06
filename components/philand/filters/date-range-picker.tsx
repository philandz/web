"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MAX_RANGE_DAYS,
  clampRange,
  detectRangeToken,
  parseLocalYmd,
  parseRangeToken,
  resolveRange,
  shiftExplicitRange,
  shiftRangeToken,
  validateRange,
  type DateRange,
} from "@/lib/date-range";

export interface DateRangeValue {
  /** Token ("period:0", "all", …) or "custom". */
  range: string;
  from: string;
  to: string;
}

interface Props {
  value: DateRangeValue;
  /** Budget period start day; when it is not 1 the "period" presets are offered. */
  periodStartDay?: number;
  onChange: (next: DateRangeValue) => void;
  className?: string;
}

type PresetGroup = { key: string; tokens: string[] };

/** Label key for a token: offset 0 → "thisX", -1 → "lastX", anything else has no name (dates only). */
function labelKey(token: string): string | null {
  const p = parseRangeToken(token);
  if (!p) return null;
  const name = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);
  switch (p.kind) {
    case "today":
    case "yesterday":
    case "last7":
    case "last30":
    case "all":
    case "custom":
      return p.kind;
    default:
      if (p.offset === 0) return `this${name(p.kind)}`;
      if (p.offset === -1) return `last${name(p.kind)}`;
      return null;
  }
}

export function DateRangePicker({ value, periodStartDay, onChange, className }: Props) {
  const t = useTranslations("budget.transactions.range");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ctx = useMemo(() => ({ periodStartDay }), [periodStartDay]);

  // An old link may carry bare from/to; name the preset it matches so the label is meaningful.
  const token = value.range === "custom" ? detectRangeToken(value.from, value.to, ctx) : value.range;
  const known = labelKey(token);
  const isAll = token === "all";

  const fmt = useMemo(() => {
    const now = new Date().getFullYear();
    return (ymd: string) => {
      const d = parseLocalYmd(ymd);
      if (!d) return ymd;
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        ...(d.getFullYear() !== now ? { year: "numeric" as const } : {}),
      }).format(d);
    };
  }, [locale]);

  const dates = isAll
    ? ""
    : value.from && value.to
      ? value.from === value.to
        ? fmt(value.from)
        : `${fmt(value.from)} – ${fmt(value.to)}`
      : value.from
        ? `≥ ${fmt(value.from)}`
        : value.to
          ? `≤ ${fmt(value.to)}`
          : "";
  const label = known ? t(known) : t("custom");

  const error = validateRange(value.from, value.to);

  function choose(tok: string) {
    const r = tok === "custom" ? null : resolveRange(tok, ctx);
    if (tok === "custom") {
      onChange({ range: "custom", from: value.from, to: value.to });
      return;
    }
    onChange({ range: tok, from: r?.from ?? "", to: r?.to ?? "" });
    setOpen(false);
  }

  function step(dir: 1 | -1) {
    const next = shiftRangeToken(token, dir);
    if (next) {
      choose(next);
      return;
    }
    const moved = shiftExplicitRange({ from: value.from, to: value.to }, dir);
    if (moved) onChange({ range: "custom", ...moved });
  }

  function setCustom(patch: Partial<DateRange>) {
    const merged = { from: value.from, to: value.to, ...patch };
    const cut = clampRange(merged.from, merged.to);
    setClamped(cut.to !== merged.to);
    onChange({ range: "custom", from: cut.from, to: cut.to });
  }

  const groups: PresetGroup[] = [
    { key: "days", tokens: ["today", "yesterday", "last7", "last30"] },
    ...(periodStartDay && periodStartDay !== 1
      ? [{ key: "period", tokens: ["period:0", "period:-1"] }]
      : []),
    {
      key: "calendar",
      tokens: ["week:0", "week:-1", "month:0", "month:-1", "quarter:0", "quarter:-1", "year:0", "year:-1"],
    },
    { key: "open", tokens: ["all"] },
  ];

  const canStep = !isAll;

  return (
    <div className={cn("inline-flex items-center", className)} data-testid="date-range-picker">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={!canStep}
        aria-label={t("previous")}
        className="flex h-9 w-8 items-center justify-center rounded-l-lg border border-r-0 border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("title")}
            className={cn(
              "flex h-9 min-w-0 items-center gap-1.5 border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
              open && "bg-muted/60 ring-1 ring-ring",
              error && "border-destructive text-destructive",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
            {dates && <span className="hidden truncate font-normal text-muted-foreground sm:inline">· {dates}</span>}
            <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-72 p-0">
          <div className="border-b border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-semibold text-foreground">{t("title")}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{dates || t("all")}</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {groups.map((g, i) => (
              <div key={g.key} className={cn(i > 0 && "mt-1 border-t border-border/60 pt-1")}>
                <div className="grid grid-cols-2 gap-0.5">
                  {g.tokens.map((tok) => {
                    const selected = token === tok;
                    const key = labelKey(tok)!;
                    return (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => choose(tok)}
                        aria-pressed={selected}
                        data-testid={`range-${tok}`}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                          selected && "bg-primary/10 font-medium text-primary",
                          g.tokens.length === 1 && "col-span-2",
                        )}
                      >
                        {t(key)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border bg-muted/30 px-3 py-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("custom")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted-foreground">
                {t("from")}
                <input
                  type="date"
                  value={value.from}
                  max={value.to || undefined}
                  onChange={(e) => setCustom({ from: e.target.value })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted-foreground">
                {t("to")}
                <input
                  type="date"
                  value={value.to}
                  min={value.from || undefined}
                  onChange={(e) => setCustom({ to: e.target.value })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            </div>
            <p className={cn("mt-1.5 text-[11px]", error ? "font-medium text-destructive" : "text-muted-foreground")}>
              {error ? t(`errors.${error}`) : clamped ? t("clamped", { days: MAX_RANGE_DAYS }) : t("maxHint", { days: MAX_RANGE_DAYS })}
            </p>
          </div>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={!canStep}
        aria-label={t("next")}
        className="flex h-9 w-8 items-center justify-center rounded-r-lg border border-l-0 border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
