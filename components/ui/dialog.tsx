"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange?.(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
        aria-hidden
      />
      {/* Inject onClose into DialogContent children */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as { displayName?: string }).displayName === "DialogContent") {
          return React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, {
            onClose: () => onOpenChange?.(false),
          });
        }
        return child;
      })}
    </div>
  );
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    role="dialog"
    aria-modal
    className={cn(
      "relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-float animate-fade-in-up",
      className
    )}
    {...props}
  >
    {onClose ? (
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    ) : null}
    {children}
  </div>
));
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5 pr-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
