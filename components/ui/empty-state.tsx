"use client";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-xs mx-auto">
      <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/30 text-[#0d9488]">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="default" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
