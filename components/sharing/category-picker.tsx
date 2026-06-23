"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useCategoriesQuery } from "@/modules/category/hooks";
import { cn } from "@/lib/utils";

type CategoryPickerProps = {
  budgetId: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  placeholder?: string;
  filterType?: "expense" | "income";
  disabled?: boolean;
};

export function CategoryPicker({
  budgetId,
  value,
  onChange,
  placeholder = "Select category",
  filterType = "expense",
  disabled = false,
}: CategoryPickerProps) {
  const { data: categories = [], isLoading } = useCategoriesQuery(budgetId);
  const [open, setOpen] = useState(false);

  const filtered = categories.filter(
    (c) => !c.archived && (!filterType || c.type === filterType)
  );
  const selected = filtered.find((c) => c.id === value) ?? null;

  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "hover:bg-accent/40 disabled:opacity-50"
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: selected.color }}
            >
              {selected.icon}
            </span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            className={cn(
              "absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
            )}
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="text-muted-foreground">None</span>
                {value === null && <Check className="ml-auto h-4 w-4" />}
              </button>
            </li>
            {filtered.map((c) => {
              const isSel = c.id === value;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                      isSel && "bg-accent/60"
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.icon}
                    </span>
                    <span className="truncate">{c.name}</span>
                    {isSel && <Check className="ml-auto h-4 w-4" />}
                  </button>
                </li>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                No categories in this budget yet.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
