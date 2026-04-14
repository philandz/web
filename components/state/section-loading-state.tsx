import { Skeleton } from "@/components/ui/skeleton";

const ROW_HEIGHTS = ["h-20", "h-16", "h-24", "h-14", "h-20"];

export function SectionLoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className={`w-full rounded-2xl ${ROW_HEIGHTS[i % ROW_HEIGHTS.length]}`}
        />
      ))}
    </div>
  );
}
