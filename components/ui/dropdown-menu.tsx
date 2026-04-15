"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  contentRef: { current: null },
});

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null) as React.MutableRefObject<HTMLElement | null>;
  const contentRef = React.useRef<HTMLDivElement | null>(null) as React.MutableRefObject<HTMLDivElement | null>;

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insideContent = contentRef.current?.contains(target);
      if (!insideTrigger && !insideContent) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext);
  return React.cloneElement(children, {
    ref: (el: HTMLElement | null) => { triggerRef.current = el; },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(!open);
      children.props.onClick?.(e);
    },
    "aria-expanded": open,
  });
}

function DropdownMenuContent({
  className,
  align = "start",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const { open, triggerRef, contentRef } = React.useContext(DropdownMenuContext);
  const [coords, setCoords] = React.useState<{ top: number; left?: number; right?: number } | null>(null);

  const measure = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = contentRef.current?.offsetHeight ?? 120;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const flipUp = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const top = flipUp
      ? rect.top + scrollY - menuHeight - 4
      : rect.bottom + scrollY + 4;

    if (align === "end") {
      setCoords({ top, right: window.innerWidth - rect.right - scrollX });
    } else {
      setCoords({ top, left: rect.left + scrollX });
    }
  }, [align, triggerRef, contentRef]);

  // Initial position on open
  React.useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open, measure]);

  // Re-measure once after portal renders to get real height
  const measuredRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!open) { measuredRef.current = false; return; }
    if (measuredRef.current) return;
    if (!contentRef.current) return;
    measuredRef.current = true;
    measure();
  });

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const style: React.CSSProperties = {
    position: "absolute",
    top: coords?.top ?? 0,
    ...(coords?.left !== undefined ? { left: coords.left } : {}),
    ...(coords?.right !== undefined ? { right: coords.right } : {}),
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={contentRef}
      style={style}
      className={cn(
        "min-w-[8rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-float animate-fade-in-up",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

function DropdownMenuItem({ className, children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <button
      className={cn("flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted focus:bg-muted focus:outline-none", className)}
      onClick={(e) => { onClick?.(e); setOpen(false); }}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}

function DropdownMenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}>{children}</div>;
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger };
