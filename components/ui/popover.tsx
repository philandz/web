"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The wrapper supports two patterns:
 *
 * 1. Legacy `trigger` prop: `<Popover trigger={<button/>}>{panel}</Popover>`
 *    renders the trigger as the Radix Trigger and the panel as Content.
 *
 * 2. Compound children: `<Popover><PopoverTrigger/><PopoverContent/></Popover>`
 *    splits the children — anything that is `<PopoverTrigger>` becomes the
 *    Radix Trigger, anything else (the actual panel markup) goes into
 *    Content. This avoids the silent Radix runtime error that occurs when a
 *    PopoverTrigger ends up nested inside a Content.
 */
export function Popover({
  children,
  trigger,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}) {
  // When `trigger` prop is given use it; otherwise pick the first
  // <PopoverTrigger> child out of `children` so it isn't rendered twice
  // (Radix Trigger renders its child via `asChild`).
  let triggerEl: React.ReactNode = trigger;
  let contentChildren: React.ReactNode = children;
  if (triggerEl === undefined && children) {
    const arr = React.Children.toArray(children);
    const triggerIdx = arr.findIndex(
      (child) => React.isValidElement(child) && child.type === PopoverTrigger,
    );
    if (triggerIdx !== -1) {
      triggerEl = arr[triggerIdx];
      contentChildren = arr.filter((_, idx) => idx !== triggerIdx);
    }
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {triggerEl ? (
        <PopoverPrimitive.Trigger asChild>{triggerEl}</PopoverPrimitive.Trigger>
      ) : null}
      {contentChildren}
    </PopoverPrimitive.Root>
  );
}

export const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * Wraps the Radix Content with the project's default surface styling
 * (card background, border, shadow, animation). Callers can override
 * individual tokens via the `className` prop.
 */
export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[160px] rounded-xl border border-border bg-card shadow-float outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

export const PopoverPortal = PopoverPrimitive.Portal;
export const PopoverRoot = PopoverPrimitive.Root;
