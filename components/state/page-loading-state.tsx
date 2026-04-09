import { LoadingSpinner } from "@/components/state/loading-spinner";

export function PageLoadingState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <LoadingSpinner className="h-4 w-4" />
        <span>{message}</span>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
