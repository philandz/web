import { Skeleton } from "@/components/ui/skeleton";

export function SectionLoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading section">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={`section-skeleton-${index}`} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
