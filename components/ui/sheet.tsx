"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      {children}
    </div>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "right" | "left";
}

export function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <div
      role="dialog"
      aria-modal
      className={cn(
        "relative z-10 flex h-full w-full flex-col bg-card shadow-float",
        side === "right" ? "ml-auto" : "mr-auto",
        "sm:max-w-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between border-b border-border/60 px-5 py-4", className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex justify-end gap-2 border-t border-border/60 px-5 py-4", className)}
      {...props}
    />
  );
}
