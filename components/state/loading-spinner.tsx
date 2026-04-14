import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin",
        "h-4 w-4",
        className
      )}
      aria-hidden="true"
    />
  );
}
