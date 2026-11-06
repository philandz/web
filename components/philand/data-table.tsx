"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check as CheckIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsUpDown,
  ChevronLeft,
  Tag as TagIcon,
  Users as UsersIcon,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import type { SortDir } from "@/hooks/use-table-state";

// ---------------------------------------------------------------------------
// Semantic color chips for status / enum values
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active:      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  disabled:    "bg-slate-500/10 text-slate-500 border-slate-400/25",
  pending:     "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
  invited:     "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25",
  deleted:     "bg-red-500/12 text-red-500 border-red-500/25",
  blocked:     "bg-red-500/12 text-red-500 border-red-500/25",
  income:      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  expense:     "bg-red-500/12 text-red-500 border-red-500/25",
};

const TYPE_STYLES: Record<string, string> = {
  super_admin: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25",
  normal:      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  owner:       "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
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
          aria-label="Rows per page"
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
// TypePopover — single-select chip with a popover radio list
// (Replaces the segmented EnumFilter for type so the toolbar reads
// consistently: every filter is a chip that opens a popover.)
// ---------------------------------------------------------------------------

type TypePopoverValue<T extends string> = T;

export function TypePopover<T extends string>({
  value,
  options,
  onChange,
  labels,
}: {
  value: TypePopoverValue<T>;
  options: { value: T; label: string }[];
  onChange: (v: TypePopoverValue<T>) => void;
  labels: { title: string; all: string };
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  const isAll = value === ("all" as unknown as T);

  function pick(v: T) {
    onChange(v);
    setOpen(false);
  }

  function pickAll() {
    onChange("all" as unknown as T);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            open && "ring-1 ring-ring bg-muted/60",
            !isAll && "border-primary/30 bg-primary/5 text-primary"
          )}
        >
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{active?.label ?? labels.all}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 p-0">
        <div className="border-b border-border bg-muted/40 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">{labels.title}</p>
          {!isAll && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Filtering by: <span className="font-medium text-foreground">{active?.label}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col p-1">
          <button
            type="button"
            onClick={pickAll}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
              isAll && "bg-primary/10 text-primary font-medium"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                isAll
                  ? "border-primary bg-primary"
                  : "border-input bg-background group-hover:border-muted-foreground/50"
              )}
              aria-hidden="true"
            >
              {isAll && <span className="block h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
            </span>
            <span className="flex-1 text-left">{labels.all}</span>
          </button>
          {options
            .filter((opt) => opt.value !== ("all" as unknown as T))
            .map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                    selected && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      selected
                        ? "border-primary bg-primary"
                        : "border-input bg-background group-hover:border-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  >
                    {selected && (
                      <span className="block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className="flex-1 text-left">{opt.label}</span>
                </button>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
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
// Member popover with checkbox list
// ---------------------------------------------------------------------------

export interface PeopleLabels {
  trigger: string;
  title: string;
  clear: string;
  selected: string;
  empty: string;
  emptyHint: string;
  onlyMe?: string;
}

export function MemberPopover({
  value,
  onChange,
  members,
  labels,
  meId,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  members: { userId: string; displayName: string; avatar?: string | null }[];
  labels?: PeopleLabels;
  /** When set (and labelled), the list starts with a one-tap "only me". */
  meId?: string;
}) {
  const L: PeopleLabels = labels ?? {
    trigger: "Members",
    title: "Filter by member",
    clear: "Clear",
    selected: "selected",
    empty: "No members yet",
    emptyHint: "Invite teammates to filter by them.",
  };
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const safeMembers = members ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            open && "ring-1 ring-ring bg-muted/60",
            value.length > 0 && "border-primary/30 bg-primary/5 text-primary"
          )}
        >
          <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{L.trigger}</span>
          {value.length > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {value.length}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
        <div className="border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{L.title}</p>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary"
              >
                {L.clear}
              </button>
            )}
          </div>
          {value.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {value.length} {L.selected}
            </p>
          )}
        </div>
        {safeMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-3 py-6 text-center">
            <UsersIcon className="h-5 w-5 text-muted-foreground/60" />
            <p className="text-xs font-medium text-foreground">{L.empty}</p>
            <p className="text-[11px] text-muted-foreground">{L.emptyHint}</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto p-1">
            {meId && L.onlyMe && safeMembers.some((m) => m.userId === meId) && (
              <button
                type="button"
                onClick={() => onChange(value.length === 1 && value[0] === meId ? [] : [meId])}
                className={cn(
                  "mb-1 w-full rounded-md border border-dashed border-primary/40 px-2 py-1.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5",
                  value.length === 1 && value[0] === meId && "bg-primary/10",
                )}
              >
                {L.onlyMe}
              </button>
            )}
            {safeMembers.map((m) => {
              const checked = value.includes(m.userId);
              return (
                <label
                  key={m.userId}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    checked ? "bg-primary/8 text-foreground" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background group-hover:border-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  >
                    {checked && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.userId)}
                    className="sr-only"
                    aria-label={`Filter by ${m.displayName}`}
                  />
                  <UserAvatar name={m.displayName} src={m.avatar} size={22} />
                  <span className="flex-1 truncate text-foreground">{m.displayName}</span>
                  {checked && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-primary">on</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Category popover with checkbox list
// ---------------------------------------------------------------------------

export function CategoryPopover({
  value,
  onChange,
  categories,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const safeCategories = categories ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            open && "ring-1 ring-ring bg-muted/60",
            value.length > 0 && "border-primary/30 bg-primary/5 text-primary"
          )}
        >
          <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Category</span>
          {value.length > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {value.length}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-60 p-0">
        <div className="border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Filter by category</p>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary"
              >
                Clear
              </button>
            )}
          </div>
          {value.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{value.length} selected</p>
          )}
        </div>
        {safeCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-3 py-6 text-center">
            <TagIcon className="h-5 w-5 text-muted-foreground/60" />
            <p className="text-xs font-medium text-foreground">No categories yet</p>
            <p className="text-[11px] text-muted-foreground">Create a category to filter by it.</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto p-1">
            {safeCategories.map((c) => {
              const checked = value.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    checked ? "bg-primary/8 text-foreground" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background group-hover:border-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  >
                    {checked && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="sr-only"
                    aria-label={`Filter by ${c.name}`}
                  />
                  <span className="flex-1 truncate text-foreground">{c.name}</span>
                  {checked && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-primary">on</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Collapsible filter panel
// ---------------------------------------------------------------------------

export function FilterPanel({
  open,
  onToggle,
  activeFilterCount,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {/* Collapsed row: Filter button + pills hint */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
            open
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-input bg-background text-foreground hover:bg-muted"
          )}
        >
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {/* Expanded controls */}
      {open && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
