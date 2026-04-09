import type { ButtonHTMLAttributes } from "react";

import { LoadingSpinner } from "@/components/state/loading-spinner";
import { cn } from "@/lib/utils";

export function LoadingButton({
  loading,
  loadingLabel,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      aria-busy={loading}
    >
      {loading ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
