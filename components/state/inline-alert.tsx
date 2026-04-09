import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const toneClassMap = {
  error: "state-error",
  success: "state-success",
  info: "border border-border bg-muted/50 text-foreground"
} as const;

export function InlineAlert({
  tone,
  children,
  className
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("rounded-xl px-3 py-2 text-sm", toneClassMap[tone], className)}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      {children}
    </p>
  );
}
