"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Banknote } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Labels {
  trigger: string;
  title: string;
  min: string;
  max: string;
  clear: string;
  apply: string;
  order: string;
}

interface Props {
  min?: number;
  max?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
  labels: Labels;
  /** Render the fields inline (inside a sheet) instead of in a popover. */
  inline?: boolean;
}

function toNumber(s: string): number | undefined {
  const digits = s.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

function show(n: number | undefined): string {
  return n == null ? "" : new Intl.NumberFormat("vi-VN").format(n);
}

function Fields({ min, max, onChange, labels }: Omit<Props, "inline">) {
  const [lo, setLo] = useState(show(min));
  const [hi, setHi] = useState(show(max));
  useEffect(() => setLo(show(min)), [min]);
  useEffect(() => setHi(show(max)), [max]);

  const a = toNumber(lo);
  const b = toNumber(hi);
  const bad = a != null && b != null && a > b;

  return (
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted-foreground">
          {labels.min}
          <input
            inputMode="numeric"
            value={lo}
            onChange={(e) => setLo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted-foreground">
          {labels.max}
          <input
            inputMode="numeric"
            value={hi}
            onChange={(e) => setHi(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>
      {bad && <p className="text-[11px] font-medium text-destructive">{labels.order}</p>}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setLo("");
            setHi("");
            onChange(undefined, undefined);
          }}
          className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary"
        >
          {labels.clear}
        </button>
        <button
          type="button"
          disabled={bad}
          onClick={() => onChange(a, b)}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {labels.apply}
        </button>
      </div>
    </div>
  );
}

export function AmountFilter(props: Props) {
  const { min, max, labels, inline } = props;
  const [open, setOpen] = useState(false);
  const active = min != null || max != null;

  if (inline) {
    return (
      <div className="rounded-lg border border-input">
        <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold">{labels.title}</p>
        <Fields {...props} />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            open && "bg-muted/60 ring-1 ring-ring",
            active && "border-primary/30 bg-primary/5 text-primary",
          )}
        >
          <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{labels.trigger}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
        <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold">{labels.title}</p>
        <Fields
          {...props}
          onChange={(a, b) => {
            props.onChange(a, b);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
