import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/** One important number with a caption — the building block of overview screens. */
export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
