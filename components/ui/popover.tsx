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
  align = "center",
  sideOffset = 4,
  className,
}: {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}) {
  let triggerEl: React.ReactNode = trigger;
  let contentEl: React.ReactNode = children;

  if (trigger === undefined) {
    const arr = React.Children.toArray(children);
    const triggerChild = arr.find(
      (child) => React.isValidElement(child) && child.type === PopoverTrigger,
    );
    if (triggerChild) {
      triggerEl = triggerChild;
      contentEl = arr.filter((child) => child !== triggerChild);
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {triggerEl ? (
        <PopoverPrimitive.Trigger asChild>{triggerEl}</PopoverPrimitive.Trigger>
      ) : null}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-50 min-w-[160px] rounded-xl border border-border bg-background p-1 shadow-md shadow-black/5 outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
        >
          {contentEl}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = PopoverPrimitive.Content;
export const PopoverPortal = PopoverPrimitive.Portal;
export const PopoverRoot = PopoverPrimitive.Root;
