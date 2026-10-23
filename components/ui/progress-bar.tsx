import { cn } from "@/lib/utils";
import { progressPct, progressStatus, type ProgressStatus } from "@/lib/budget/progress";

const BAR: Record<ProgressStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  over: "bg-red-500",
};

type ProgressBarProps = {
  spent: number;
  planned: number;
  className?: string;
  label?: string;
};

/** Spend vs plan bar: green < 80%, amber 80–100%, red over plan. */
export function ProgressBar({ spent, planned, className, label }: ProgressBarProps) {
  const status = progressStatus(spent, planned);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPct(spent, planned))}
      data-status={status}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", BAR[status])}
        style={{ width: `${progressPct(spent, planned)}%` }}
      />
    </div>
  );
}
