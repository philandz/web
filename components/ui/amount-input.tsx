"use client";

import { useEffect, useRef, useState } from "react";

type AmountInputProps = {
  value: string | number;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
};

function formatWithSeparators(raw: string): string {
  // Remove all non-digit characters
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

function rawValue(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function AmountInput({
  value,
  onChange,
  currency = "₫",
  placeholder = "0",
  className = "",
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === "number") {
      return formatWithSeparators(String(value));
    }
    return formatWithSeparators(value);
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep display in sync when value changes externally (e.g., clearing)
  useEffect(() => {
    const currentRaw = rawValue(displayValue);
    const newRaw = typeof value === "number" ? String(value) : value;
    if (currentRaw !== newRaw) {
      setDisplayValue(formatWithSeparators(newRaw));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDisplayClick() {
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
    setDisplayValue(formatWithSeparators(raw));
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center cursor-text ${className}`}
      onClick={handleDisplayClick}
    >
      {/* Visible formatted display */}
      <div className="text-4xl font-bold tabular-nums text-center w-full">
        {displayValue || (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <span className="text-2xl font-normal text-muted-foreground ml-1">
          {currency}
        </span>
      </div>

      {/* Hidden actual number input for accessibility and form behavior */}
      <input
        ref={inputRef}
        type="number"
        value={typeof value === "number" ? value : parseInt(rawValue(String(value))) || 0}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        style={{ zIndex: -1 }}
        aria-label="Amount input"
      />
    </div>
  );
}
