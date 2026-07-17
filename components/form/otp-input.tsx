"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A 6-digit OTP / verification-code input.
 *
 * Each digit lives in its own single-character input. Typing a digit auto-
 * advances focus; Backspace jumps to the previous slot; pasting a 6-digit
 * code fills all slots and fires `onComplete`.
 *
 * Designed to be controlled — pass `value` (a 6-char string) and react to
 * `onChange` / `onComplete`. When `autoFocus` is true, the first digit
 * receives focus on mount.
 */
export type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = false,
  disabled = false,
  invalid = false,
  className,
  ariaLabel = "One-time code"
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.padEnd(length, "").split("");
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const setDigit = React.useCallback(
    (index: number, ch: string) => {
      const cleaned = ch.replace(/\D/g, "").slice(0, 1);
      const next = digits.slice();
      next[index] = cleaned;
      const merged = next.join("").slice(0, length);
      onChange(merged);
      if (cleaned && index < length - 1) {
        refs.current[index + 1]?.focus();
        refs.current[index + 1]?.select();
      }
      if (merged.length === length && !merged.includes("")) {
        onComplete?.(merged);
      }
    },
    [digits, length, onChange, onComplete]
  );

  const handleKeyDown = React.useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          // Clear current slot but stay focused.
          e.preventDefault();
          setDigit(index, "");
        } else if (index > 0) {
          e.preventDefault();
          const prev = refs.current[index - 1];
          prev?.focus();
          // Clear previous on next tick so React commits the focus first.
          setTimeout(() => setDigit(index - 1, ""), 0);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        refs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        refs.current[index + 1]?.focus();
      }
    },
    [digits, length, setDigit]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!pasted) return;
      onChange(pasted.padEnd(length, "").slice(0, length));
      const focusIndex = Math.min(pasted.length, length - 1);
      refs.current[focusIndex]?.focus();
      if (pasted.length === length) {
        onComplete?.(pasted);
      }
    },
    [length, onChange, onComplete]
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center justify-center gap-2", className)}
      onPaste={handlePaste}
    >
      {digits.map((digit, i) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus={autoFocus && i === 0}
          className={cn(
            "h-12 w-10 rounded-xl border border-input bg-background text-center text-lg font-semibold text-foreground tabular-nums outline-none transition",
            "focus:border-ring focus:ring-2 focus:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-60",
            invalid ? "border-destructive focus:border-destructive focus:ring-destructive/35" : ""
          )}
        />
      ))}
    </div>
  );
}