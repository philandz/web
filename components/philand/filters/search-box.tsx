"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  /** The applied query text. External changes (clear all, back button) replace what is typed. */
  value: string;
  onCommit: (q: string) => void;
  placeholder: string;
  clearLabel: string;
  debounceMs?: number;
  className?: string;
}

/** Search input that applies as you type (debounced) and on Enter; there is no Search button. */
export function SearchBox({ value, onCommit, placeholder, clearLabel, debounceMs = 300, className }: Props) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(value);

  // follow the applied value when it changed from outside
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function commit(next: string) {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = next.trim();
    if (trimmed === last.current) return;
    last.current = trimmed;
    onCommit(trimmed);
  }

  function change(next: string) {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), debounceMs);
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(text);
          if (e.key === "Escape" && text) {
            setText("");
            commit("");
          }
        }}
        className="pl-9 pr-8"
        placeholder={placeholder}
        aria-label={placeholder}
        type="search"
        data-testid="search-box"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            commit("");
          }}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
