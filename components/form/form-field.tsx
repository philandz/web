import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>

      {children}

      {error ? (
        <p className="text-xs text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
