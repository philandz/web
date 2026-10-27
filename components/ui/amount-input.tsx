"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseVnd } from "@/lib/money/parse-vnd";

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
  // Shorthand being typed ("50k", "1tr5"); converted to digits on blur / Enter.
  const [shorthand, setShorthand] = useState<string | null>(null);
  // Set when a shorthand could not be parsed: the field is cleared and the
  // parent sees an empty amount, so a stale value can never be submitted.
  const [invalid, setInvalid] = useState(false);
  const t = useTranslations("common.amountInput");

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

  function commitShorthand() {
    if (shorthand === null) return;
    const parsed = parseVnd(shorthand);
    setShorthand(null);
    if (parsed !== null) {
      setInvalid(false);
      onChange(String(parsed));
      setDisplayValue(formatWithSeparators(String(parsed)));
      return;
    }
    // Unreadable shorthand ("1t", "abc"): clear the field so the parent does
    // not keep the previous amount and submit it behind the invalid text.
    setInvalid(true);
    onChange("");
    setDisplayValue("");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    if (/[^\d\s.,]/.test(text)) {
      // letters present: user is typing shorthand like 50k / 1tr5
      setShorthand(text);
      setInvalid(false);
      setDisplayValue(text);
      return;
    }
    setShorthand(null);
    setInvalid(false);
    const raw = text.replace(/\D/g, "");
    onChange(raw);
    setDisplayValue(formatWithSeparators(raw));
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center cursor-text ${className}`}
      onClick={handleDisplayClick}
      data-invalid={invalid || undefined}
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
        type="text"
        inputMode="text"
        value={shorthand ?? (typeof value === "number" ? value : parseInt(rawValue(String(value))) || 0)}
        onChange={handleInputChange}
        onBlur={commitShorthand}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitShorthand();
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        style={{ zIndex: -1 }}
        aria-label="Amount input"
        aria-invalid={invalid}
      />

      {invalid ? (
        <p className="mt-1 text-xs text-destructive" role="alert" aria-live="assertive">
          {t("invalid")}
        </p>
      ) : null}
    </div>
  );
}
