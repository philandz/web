"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, ChevronRight, ChevronsUpDown, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { SortDir } from "@/hooks/use-table-state";

// ---------------------------------------------------------------------------
// Semantic color chips for status / enum values
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active:      "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  disabled:    "bg-slate-500/10 text-slate-500 border-slate-400/25",
  pending:     "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  invited:     "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25",
  deleted:     "bg-red-500/12 text-red-500 border-red-500/25",
  blocked:     "bg-red-500/12 text-red-500 border-red-500/25",
  income:      "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  expense:     "bg-red-500/12 text-red-500 border-red-500/25",
};

const TYPE_STYLES: Record<string, string> = {
  super_admin: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25",
  normal:      "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  owner:       "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  admin:       "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  member:      "bg-slate-500/10 text-slate-500 border-slate-400/25",
};

export function StatusChip({ value, label }: { value: string; label: string }) {
  const style = STATUS_STYLES[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none", style)}>
      {label}
    </span>
  );
}

export function TypeChip({ value, label }: { value: string; label: string }) {
  const style = TYPE_STYLES[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none", style)}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

export function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pagination bar
// ---------------------------------------------------------------------------

export function Pagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  onPage,
  onPageSize,
  pageSizeOptions = [10, 20, 50],
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
  pageSizeOptions?: number[];
}) {
  const from = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 pt-3 text-xs text-muted-foreground">
      <span>{from}–{to} of {totalRows}</span>
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-7 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[4rem] text-center">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enum filter — segmented pill control
// ---------------------------------------------------------------------------

export function EnumFilter<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T | undefined) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex h-10 items-center gap-0.5 rounded-xl border border-input bg-background p-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? undefined : opt.value)}
          className={cn(
            "h-8 rounded-lg px-3 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range filter — compact inline date picker pair
// ---------------------------------------------------------------------------

export function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
  onClear,
  className,
}: {
  from?: string;
  to?: string;
  onFrom: (v: string | undefined) => void;
  onTo: (v: string | undefined) => void;
  onClear: () => void;
  className?: string;
}) {
  const hasDate = Boolean(from || to);
  return (
    <div className={cn(
      "flex h-10 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm transition-colors",
      hasDate && "border-primary/50 bg-primary/5",
      className,
    )}>
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        type="date"
        value={from ?? ""}
        onChange={(e) => onFrom(e.target.value || undefined)}
        className="min-w-0 flex-1 bg-transparent text-xs text-foreground focus:outline-none"
      />
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      <input
        type="date"
        value={to ?? ""}
        onChange={(e) => onTo(e.target.value || undefined)}
        className="min-w-0 flex-1 bg-transparent text-xs text-foreground focus:outline-none"
      />
      {hasDate && (
        <button
          type="button"
          onClick={onClear}
          className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Clear dates"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active filter badge
// ---------------------------------------------------------------------------

export function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {label}
      <button onClick={onClear} className="ml-0.5 rounded-full hover:text-primary/70" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Date dropdown with presets
// ---------------------------------------------------------------------------

type DatePreset = "today" | "last7Days" | "thisMonth" | "custom";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  last7Days: "Last 7 days",
  thisMonth: "This Month",
  custom: "Custom range",
};

export function DateDropdown({
  from,
  to,
  onSelect,
  onCustomChange,
  validationError,
}: {
  from: string;
  to: string;
  onSelect: (preset: DatePreset) => void;
  onCustomChange: (from: string, to: string) => void;
  validationError?: string;
}) {
  const currentPreset = (() => {
    if (!from && !to) return null;
    if (from && to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fmtYmd = (d: Date) => d.toISOString().split("T")[0];
      const t = fmtYmd(today);
      if (from === t && to === t) return "today" as DatePreset;
      const fromD = new Date(from); const toD = new Date(to);
      const diffMs = toD.getTime() - fromD.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 6) {
        const from7 = new Date(today); from7.setDate(from7.getDate() - 6);
        if (fmtYmd(from7) === from) return "last7Days" as DatePreset;
      }
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (from === fmtYmd(firstOfMonth) && to === t) return "thisMonth" as DatePreset;
    }
    return "custom" as DatePreset;
  })();

  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(currentPreset === "custom");

  function handlePreset(p: DatePreset) {
    if (p === "custom") {
      setShowCustom(true);
      onSelect("custom");
    } else {
      setShowCustom(false);
      setOpen(false);
      onSelect(p);
    }
  }

  const triggerLabel = currentPreset && currentPreset !== "custom"
    ? DATE_PRESET_LABELS[currentPreset]
    : showCustom
    ? "Custom range"
    : DATE_PRESET_LABELS.thisMonth;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            open && "ring-1 ring-ring"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{triggerLabel}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-48 p-1">
        <div className="flex flex-col gap-0.5">
          {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-muted",
                currentPreset === preset && "bg-primary/5 text-primary font-medium"
              )}
            >
              {DATE_PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="mt-1 border-t border-border pt-2">
            <div className="flex flex-col gap-1.5 px-1">
              <input
                type="date"
                value={from}
                onChange={(e) => onCustomChange(e.target.value, to)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => onCustomChange(from, e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
              />
              {validationError && (
                <p className="text-xs text-red-500">{validationError}</p>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
