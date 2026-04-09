import type { ReactNode } from "react";

export function PageErrorState({
  message,
  action
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <section className="state-error rounded-2xl p-6" role="alert" aria-live="assertive">
      <p className="text-sm font-medium">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
