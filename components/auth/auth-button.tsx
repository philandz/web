import type { ButtonHTMLAttributes } from "react";

import { LoadingSpinner } from "@/components/state/loading-spinner";
import { cn } from "@/lib/utils";

export function AuthButton({
  className,
  variant = "primary",
  loading,
  loadingLabel,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      className={cn(
        "h-11 w-full rounded-xl text-sm font-semibold transition duration-200 ease-smooth active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-highlight text-foreground hover:bg-highlight/90"
          : "border border-border bg-card text-foreground hover:bg-muted/70",
        className
      )}
      aria-busy={loading}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
        {loading ? loadingLabel ?? children : children}
      </span>
    </button>
  );
}
