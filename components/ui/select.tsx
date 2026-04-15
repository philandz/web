"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple native-select wrapper that matches the design system.

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({
  value: "",
  onValueChange: () => {},
});

function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  );
}

// SelectTrigger + SelectContent + SelectItem are rendered as a native <select>
// We collect items from SelectContent and render a styled <select>.

function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
  // Rendered by SelectNative below — this is a layout placeholder.
  return <>{children}</>;
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  return <>{placeholder}</>;
}

// SelectContent collects its SelectItem children and passes them to a native select.
function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function SelectItem({ value, children, disabled }: SelectItemProps) {
  // Rendered as <option> inside SelectNative
  return <option value={value} disabled={disabled}>{children as string}</option>;
}

// The actual rendered component — replaces the Trigger+Content+Item pattern
// with a styled native <select>. Usage mirrors Radix API.
function SelectNative({
  value,
  onValueChange,
  placeholder,
  className,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {placeholder && !value ? <option value="" disabled>{placeholder}</option> : null}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export { Select, SelectContent, SelectItem, SelectNative, SelectTrigger, SelectValue };
